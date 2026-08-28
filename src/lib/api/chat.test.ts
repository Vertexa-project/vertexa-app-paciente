import { beforeEach, describe, expect, it, vi } from "vitest";

// Estado do client falso. `vi.hoisted` porque a fábrica de `vi.mock` sobe para o topo do arquivo.
const db = vi.hoisted(() => ({
  messageInsert: { data: { id: "msg-1" } as { id: string } | null, error: null as unknown },
  mentionInsert: { error: null as unknown },
  messageRows: [] as Record<string, unknown>[],
  mentionRows: [] as Record<string, unknown>[],
  rpc: { data: null as unknown, error: null as unknown },
  rpcCalls: [] as { fn: string; args: unknown }[],
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (table === "chat_messages") {
          db.messageRows.push(row);
          return { select: () => ({ single: async () => db.messageInsert }) };
        }
        db.mentionRows.push(row);
        return Promise.resolve(db.mentionInsert);
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    rpc: async (fn: string, args: unknown) => {
      db.rpcCalls.push({ fn, args });
      return db.rpc;
    },
  },
}));

vi.mock("@/lib/currentPatient", () => ({
  getCurrentPatientProfileId: () => "patient-profile-1",
}));

const { listChannelProfessionals, sendPatientMessage } = await import("./chat");

const CHANNEL = "c8000000-0000-0000-0000-0000000000a1";
const PROF = "aa000000-0000-0000-0000-0000000000b2";

beforeEach(() => {
  db.messageInsert = { data: { id: "msg-1" }, error: null };
  db.mentionInsert = { error: null };
  db.messageRows = [];
  db.mentionRows = [];
  db.rpc = { data: null, error: null };
  db.rpcCalls = [];
});

describe("listChannelProfessionals — RPC channel_professionals, não embed", () => {
  // WP-FRONT-2bii-B: o parâmetro é o que separa "quem cuida de mim" de "quem escreveu isto".
  it("chama a RPC com p_channel_id e, por PADRÃO, sem os autores", async () => {
    db.rpc = { data: [], error: null };
    await listChannelProfessionals(CHANNEL);
    expect(db.rpcCalls).toEqual([
      {
        fn: "channel_professionals",
        args: { p_channel_id: CHANNEL, p_include_message_authors: false },
      },
    ]);
  });

  it("com true, pede os AUTORES junto (resolução de nome no histórico)", async () => {
    db.rpc = { data: [], error: null };
    await listChannelProfessionals(CHANNEL, true);
    expect(db.rpcCalls).toEqual([
      {
        fn: "channel_professionals",
        args: { p_channel_id: CHANNEL, p_include_message_authors: true },
      },
    ]);
  });

  it("mapeia profile_id/full_name/type/specialty/disciplines", async () => {
    db.rpc = {
      data: [
        {
          profile_id: PROF,
          full_name: "Dra. Ana Souza",
          type: "doctor",
          specialty: "Endocrinologia",
          disciplines: ["medico"],
        },
      ],
      error: null,
    };
    expect(await listChannelProfessionals(CHANNEL)).toEqual([
      {
        profileId: PROF,
        name: "Dra. Ana Souza",
        type: "doctor",
        specialty: "Endocrinologia",
        disciplines: ["medico"],
      },
    ]);
  });

  it("disciplines nulo vira lista vazia (nunca undefined na tela)", async () => {
    db.rpc = {
      data: [{ profile_id: PROF, full_name: "Bruno", type: null, specialty: null, disciplines: null }],
      error: null,
    };
    const [prof] = await listChannelProfessionals(CHANNEL);
    expect(prof.disciplines).toEqual([]);
  });

  // Item 1: falha da RPC NÃO pode virar lista vazia calada — a tela precisa do erro para exibi-lo.
  it("erro da RPC é PROPAGADO, não engolido", async () => {
    db.rpc = { data: null, error: { code: "42501", message: "Sem acesso a esta conversa." } };
    await expect(listChannelProfessionals(CHANNEL)).rejects.toMatchObject({ code: "42501" });
  });
});

describe("sendPatientMessage — a corrida da menção (item 2)", () => {
  it("sem menção: sucesso limpo", async () => {
    expect(await sendPatientMessage({ channelId: CHANNEL, body: "oi" })).toEqual({
      id: "msg-1",
      mentionFailed: false,
      mentionFailureReason: null,
    });
    expect(db.mentionRows).toHaveLength(0);
  });

  it("com menção aceita: grava chat_mentions e reporta sucesso", async () => {
    const result = await sendPatientMessage({
      channelId: CHANNEL,
      body: "oi",
      mentionedProfileId: PROF,
    });
    expect(result).toEqual({ id: "msg-1", mentionFailed: false, mentionFailureReason: null });
    expect(db.mentionRows).toEqual([{ message_id: "msg-1", mentioned_profile_id: PROF }]);
  });

  // O CORAÇÃO DO ITEM 2. A policy recusa a marcação DEPOIS que a mensagem já entrou.
  // Se isto voltar a lançar, a tela dirá que o envio falhou e convidará a reenviar.
  it("menção recusada pela RLS: NÃO lança, devolve o id da mensagem enviada", async () => {
    db.mentionInsert = {
      error: { code: "42501", message: 'new row violates row-level security policy' },
    };
    const result = await sendPatientMessage({
      channelId: CHANNEL,
      body: "oi",
      mentionedProfileId: PROF,
    });
    expect(result).toEqual({
      id: "msg-1",
      mentionFailed: true,
      mentionFailureReason: "not_participant",
    });
  });

  it("menção falha por outro motivo: reporta sem afirmar a causa", async () => {
    db.mentionInsert = { error: { code: "08006", message: "connection failure" } };
    const result = await sendPatientMessage({
      channelId: CHANNEL,
      body: "oi",
      mentionedProfileId: PROF,
    });
    expect(result.mentionFailed).toBe(true);
    expect(result.mentionFailureReason).toBe("unknown");
    expect(result.id).toBe("msg-1");
  });

  // A falha da MENSAGEM continua sendo erro de verdade — nada aqui a mascara.
  it("falha do INSERT da mensagem continua lançando", async () => {
    db.messageInsert = { data: null, error: { code: "42501", message: "denied" } };
    await expect(
      sendPatientMessage({ channelId: CHANNEL, body: "oi", mentionedProfileId: PROF }),
    ).rejects.toMatchObject({ code: "42501" });
    expect(db.mentionRows).toHaveLength(0);
  });

  it("sem texto e sem anexo, recusa antes de tocar o banco", async () => {
    await expect(sendPatientMessage({ channelId: CHANNEL, body: "   " })).rejects.toThrow(
      /Escreva uma mensagem ou anexe um arquivo/,
    );
  });
});

describe("sendPatientMessage — CRIAR RESPOSTA (WP-APP-5 item 1)", () => {
  const ORIGINAL = "11111111-1111-1111-1111-111111111111";

  it("manda reply_to_message_id CRU no INSERT", async () => {
    await sendPatientMessage({ channelId: CHANNEL, body: "resposta", replyToMessageId: ORIGINAL });
    expect(db.messageRows).toHaveLength(1);
    expect(db.messageRows[0].reply_to_message_id).toBe(ORIGINAL);
    // channel_id vai junto porque a FK é COMPOSTA — é o par que garante a mesma conversa.
    expect(db.messageRows[0].channel_id).toBe(CHANNEL);
  });

  it("sem resposta, a coluna vai NULA (não indefinida)", async () => {
    await sendPatientMessage({ channelId: CHANNEL, body: "oi" });
    expect(db.messageRows[0].reply_to_message_id).toBeNull();
  });

  // A regra "mesma conversa" é do BANCO (FK composta). Se a interface começar a validar, passa a
  // existir um segundo lugar para essa regra divergir — e o mais fraco dos dois é o daqui.
  it("NÃO valida a origem da citada: o id passa adiante como veio", async () => {
    const forasteira = "22222222-2222-2222-2222-222222222222";
    await expect(
      sendPatientMessage({ channelId: CHANNEL, body: "oi", replyToMessageId: forasteira }),
    ).resolves.toMatchObject({ id: "msg-1" });
    expect(db.messageRows[0].reply_to_message_id).toBe(forasteira);
  });

  it("resposta com menção: as duas coisas convivem no mesmo envio", async () => {
    const result = await sendPatientMessage({
      channelId: CHANNEL,
      body: "oi",
      mentionedProfileId: PROF,
      replyToMessageId: ORIGINAL,
    });
    expect(result.mentionFailed).toBe(false);
    expect(db.messageRows[0].reply_to_message_id).toBe(ORIGINAL);
    expect(db.mentionRows).toEqual([{ message_id: "msg-1", mentioned_profile_id: PROF }]);
  });
});

describe("chat.ts — Care Team não mora no roster", () => {
  it("não exporta listMyCareTeam (essa pergunta agora é getMyCareTeam)", async () => {
    const chat = await import("./chat");
    expect(chat).not.toHaveProperty("listMyCareTeam");
    expect(chat).not.toHaveProperty("getMyCareTeam");
  });
});
