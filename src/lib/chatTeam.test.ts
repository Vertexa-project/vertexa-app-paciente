import { describe, expect, it } from "vitest";

import {
  DISCIPLINE_NOT_INFORMED,
  disciplineLabel,
  messageAuthor,
  professionalDisciplineLabel,
  professionalsByProfileId,
  teamReadsLabel, teamRolesLabel,
} from "./chatTeam";
import type { ChannelProfessional } from "@/lib/api/types";

describe("disciplineLabel — catálogo public.disciplines", () => {
  it("traduz os códigos do catálogo", () => {
    expect(disciplineLabel("medico")).toBe("Médico");
    expect(disciplineLabel("nutricionista")).toBe("Nutricionista");
    expect(disciplineLabel("educador_fisico")).toBe("Educador Físico");
    expect(disciplineLabel("fisioterapeuta")).toBe("Fisioterapeuta");
    expect(disciplineLabel("psicologo")).toBe("Psicólogo");
    expect(disciplineLabel("outro")).toBe("Outro");
  });

  it("código novo no banco NÃO some da tela: vira rótulo legível", () => {
    expect(disciplineLabel("terapeuta_ocupacional")).toBe("Terapeuta ocupacional");
  });
});

describe("professionalDisciplineLabel — precedência disciplines > specialty > type", () => {
  it("usa disciplines quando a RPC as traz", () => {
    expect(
      professionalDisciplineLabel({ disciplines: ["medico"], specialty: "Endocrinologia", type: "doctor" }),
    ).toBe("Médico");
  });

  it("junta múltiplas disciplinas", () => {
    expect(
      professionalDisciplineLabel({ disciplines: ["medico", "nutricionista"], specialty: null, type: null }),
    ).toBe("Médico · Nutricionista");
  });

  it("sem disciplines, cai para specialty", () => {
    expect(
      professionalDisciplineLabel({ disciplines: [], specialty: "Endocrinologia", type: "doctor" }),
    ).toBe("Endocrinologia");
  });

  it("sem disciplines nem specialty, cai para o type", () => {
    expect(professionalDisciplineLabel({ disciplines: [], specialty: "  ", type: "personal_trainer" }))
      .toBe("Educador Físico");
  });

  // ESTE É O BUG QUE MOTIVOU A RPC: com o embed, as três chegavam nulas e a linha ficava em
  // branco sem erro. Agora a ausência é um fato reportável — a tela mostra DISCIPLINE_NOT_INFORMED.
  it("sem nenhuma das três, devolve null (a tela mostra que não foi informada)", () => {
    expect(professionalDisciplineLabel({ disciplines: [], specialty: null, type: null })).toBeNull();
    expect(DISCIPLINE_NOT_INFORMED).toBe("Disciplina não informada");
  });
});

describe("teamReadsLabel — a conversa é com a EQUIPE", () => {
  it("um profissional: singular", () => {
    expect(teamReadsLabel(["Ana"])).toBe("Ana lê esta conversa");
  });

  it("dois: 'e' sem vírgula", () => {
    expect(teamReadsLabel(["Ana", "Bruno"])).toBe("Ana e Bruno leem esta conversa");
  });

  it("três ou mais: vírgulas e 'e' no último", () => {
    expect(teamReadsLabel(["Ana", "Bruno", "Carla"])).toBe("Ana, Bruno e Carla leem esta conversa");
  });

  it("preserva a ordem em que a RPC devolveu", () => {
    expect(teamReadsLabel(["Carla", "Ana"])).toBe("Carla e Ana leem esta conversa");
  });

  it("ignora nomes vazios e devolve null sem ninguém", () => {
    expect(teamReadsLabel(["  ", ""])).toBeNull();
    expect(teamReadsLabel([])).toBeNull();
  });
});

const prof = (over: Partial<ChannelProfessional> = {}): ChannelProfessional => ({
  profileId: "prof-1",
  name: "Dra. Ana Souza",
  type: "doctor",
  specialty: null,
  disciplines: [],
  ...over,
});

describe("professionalsByProfileId", () => {
  it("indexa por profile_id", () => {
    const map = professionalsByProfileId([prof(), prof({ profileId: "prof-2", name: "Bruno" })]);
    expect(map.get("prof-1")?.name).toBe("Dra. Ana Souza");
    expect(map.get("prof-2")?.name).toBe("Bruno");
    expect(map.has("prof-9")).toBe(false);
  });

  it("lista vazia gera índice vazio, não explode", () => {
    expect(professionalsByProfileId([]).size).toBe(0);
  });
});

describe("messageAuthor — o ÚNICO lugar que resolve autor (bolha e citação)", () => {
  const byId = professionalsByProfileId([
    prof({ profileId: "prof-1", disciplines: ["medico"], specialty: "Endocrinologia" }),
  ]);

  it("mensagem da própria paciente é 'Você', sem disciplina nem tipo", () => {
    expect(messageAuthor({ isOwn: true, senderProfileId: "me", senderName: "Mariana" }, byId)).toEqual({
      name: "Você",
      discipline: null,
      type: null,
    });
  });

  // A PACIENTE ENXERGA o nome: can_see_profile tem um ramo para profissional com vínculo ativo a
  // ela. O embed é a fonte primária — a RPC não o substitui.
  it("usa o nome do embed quando ele veio", () => {
    expect(
      messageAuthor({ isOwn: false, senderProfileId: "prof-1", senderName: "Dra. Ana Souza" }, byId).name,
    ).toBe("Dra. Ana Souza");
  });

  // Rede de segurança: vínculo que deixou de ser ativo depois da mensagem enviada.
  it("embed nulo cai para o nome da RPC, não para o genérico", () => {
    expect(messageAuthor({ isOwn: false, senderProfileId: "prof-1", senderName: null }, byId).name).toBe(
      "Dra. Ana Souza",
    );
  });

  it("nome só com espaços conta como ausente", () => {
    expect(messageAuthor({ isOwn: false, senderProfileId: "prof-1", senderName: "   " }, byId).name).toBe(
      "Dra. Ana Souza",
    );
  });

  it("sem embed e sem RPC: genérico, nunca vazio", () => {
    expect(messageAuthor({ isOwn: false, senderProfileId: "sumiu", senderName: null }, byId)).toEqual({
      name: "Profissional",
      discipline: null,
      type: null,
    });
    expect(messageAuthor({ isOwn: false, senderProfileId: null, senderName: null }, byId).name).toBe(
      "Profissional",
    );
  });

  // Disciplina e tipo SÓ existem via RPC: o embed que os trazia era bloqueado por RLS.
  it("disciplina e tipo vêm da RPC, pela precedência disciplines > specialty > type", () => {
    const author = messageAuthor({ isOwn: false, senderProfileId: "prof-1", senderName: null }, byId);
    expect(author.discipline).toBe("Médico");
    expect(author.type).toBe("doctor");
  });

  it("quem não está na RPC não ganha disciplina inventada", () => {
    const author = messageAuthor(
      { isOwn: false, senderProfileId: "sumiu", senderName: "Dr. Fantasma" },
      byId,
    );
    expect(author.name).toBe("Dr. Fantasma");
    expect(author.discipline).toBeNull();
    expect(author.type).toBeNull();
  });

  it("na RPC sem disciplina, specialty nem type: rótulo de não informado", () => {
    const vazio = professionalsByProfileId([
      prof({ profileId: "prof-1", type: null, specialty: null, disciplines: [] }),
    ]);
    expect(
      messageAuthor({ isOwn: false, senderProfileId: "prof-1", senderName: "X" }, vazio).discipline,
    ).toBe(DISCIPLINE_NOT_INFORMED);
  });
});

describe("teamRolesLabel (PDF do Ernâni, tela 26)", () => {
  const P = (disciplines: string[], type: never = null as never) => ({ disciplines, specialty: null, type });
  it("junta disciplinas distintas, sem repetir", () => {
    expect(teamRolesLabel([P(["medico"]), P(["nutricionista"]), P(["nutricionista"]), P(["educador_fisico"])])).toBe("Médico · Nutricionista · Educador Físico");
  });
  it("sem nenhum papel conhecido: null (o cabeçalho cai no texto de quem lê)", () => {
    expect(teamRolesLabel([P([])])).toBeNull();
    expect(teamRolesLabel([])).toBeNull();
  });
});
