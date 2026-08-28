import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-09B2 — Care Team clínico NÃO é o roster do chat.
 *
 * Fonte: public.get_my_care_team() — zero argumentos, JWT-derived, independente de canal.
 * Estes testes travam o contrato do cliente: se alguém voltar a passar por getMyChannel /
 * channel_professionals, falha aqui.
 */

const db = vi.hoisted(() => ({
  rpc: { data: null as unknown, error: null as unknown },
  rpcCalls: [] as { fn: string; args: unknown }[],
  fromTables: [] as string[],
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      db.fromTables.push(table);
      throw new Error(`getMyCareTeam must not query ${table}`);
    },
    rpc: async (fn: string, args?: unknown) => {
      db.rpcCalls.push({ fn, args });
      return db.rpc;
    },
  },
}));

const { getMyCareTeam } = await import("./careTeam");

const PROF_A = "11111111-1111-1111-1111-1111111111a1";
const PROF_B = "22222222-2222-2222-2222-2222222222b2";
const PROF_C = "33333333-3333-3333-3333-3333333333c3";
const PROFILE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const PROFILE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2";
const PROFILE_C = "cccccccc-cccc-cccc-cccc-ccccccccccc3";

beforeEach(() => {
  db.rpc = { data: null, error: null };
  db.rpcCalls = [];
  db.fromTables = [];
});

describe("getMyCareTeam — RPC get_my_care_team, sem canal", () => {
  // T1
  it("chama a RPC com zero argumentos", async () => {
    db.rpc = { data: [], error: null };
    await getMyCareTeam();
    expect(db.rpcCalls).toEqual([{ fn: "get_my_care_team", args: undefined }]);
  });

  // T2 / T9 / T20
  it("não consulta patients, chat_channels nem channel_professionals", async () => {
    db.rpc = { data: [], error: null };
    await getMyCareTeam();
    expect(db.fromTables).toEqual([]);
    expect(db.rpcCalls.every((c) => c.fn === "get_my_care_team")).toBe(true);
    expect(db.rpcCalls.some((c) => c.fn === "channel_professionals")).toBe(false);
    const args = db.rpcCalls[0]?.args;
    expect(args).toBeUndefined();
  });

  // T3
  it("mapeia 1 membro snake_case → camelCase", async () => {
    db.rpc = {
      data: [
        {
          professional_id: PROF_A,
          profile_id: PROFILE_A,
          display_name: "Ana Prado",
          avatar_url: "https://cdn.example/ana.png",
          type: "nutritionist",
          specialty: "Nutrição clínica",
          disciplines: ["nutricionista"],
        },
      ],
      error: null,
    };
    expect(await getMyCareTeam()).toEqual([
      {
        professionalId: PROF_A,
        profileId: PROFILE_A,
        displayName: "Ana Prado",
        avatarUrl: "https://cdn.example/ana.png",
        type: "nutritionist",
        specialty: "Nutrição clínica",
        disciplines: ["nutricionista"],
      },
    ]);
  });

  // T4 — ordem da RPC preservada; os 3 saem
  it("retorno de 3 membros preserva os 3, na ordem recebida", async () => {
    db.rpc = {
      data: [
        {
          professional_id: PROF_A,
          profile_id: PROFILE_A,
          display_name: "Ana Prado",
          avatar_url: null,
          type: "nutritionist",
          specialty: null,
          disciplines: ["nutricionista"],
        },
        {
          professional_id: PROF_B,
          profile_id: PROFILE_B,
          display_name: "Bruno Salles",
          avatar_url: null,
          type: "personal_trainer",
          specialty: null,
          disciplines: ["educador_fisico"],
        },
        {
          professional_id: PROF_C,
          profile_id: PROFILE_C,
          display_name: "Clara Vieira",
          avatar_url: null,
          type: "doctor",
          specialty: "Endocrinologia",
          disciplines: ["medico"],
        },
      ],
      error: null,
    };
    const team = await getMyCareTeam();
    expect(team).toHaveLength(3);
    expect(team.map((m) => m.professionalId)).toEqual([PROF_A, PROF_B, PROF_C]);
    expect(team.map((m) => m.displayName)).toEqual(["Ana Prado", "Bruno Salles", "Clara Vieira"]);
  });

  // T5
  it("disciplines nulo ou ausente vira lista vazia", async () => {
    db.rpc = {
      data: [
        {
          professional_id: PROF_A,
          profile_id: PROFILE_A,
          display_name: "Ana Prado",
          avatar_url: null,
          type: "nutritionist",
          specialty: null,
          disciplines: null,
        },
      ],
      error: null,
    };
    const [member] = await getMyCareTeam();
    expect(member.disciplines).toEqual([]);
  });

  // T6
  it("avatar_url nulo permanece nulo (fallback é da UI)", async () => {
    db.rpc = {
      data: [
        {
          professional_id: PROF_A,
          profile_id: PROFILE_A,
          display_name: "Bruno Salles",
          avatar_url: null,
          type: "personal_trainer",
          specialty: null,
          disciplines: [],
        },
      ],
      error: null,
    };
    const [member] = await getMyCareTeam();
    expect(member.avatarUrl).toBeNull();
  });

  it("display_name vazio ou só espaço vira null (fallback é da UI)", async () => {
    db.rpc = {
      data: [
        {
          professional_id: PROF_A,
          profile_id: PROFILE_A,
          display_name: "   ",
          avatar_url: null,
          type: null,
          specialty: null,
          disciplines: [],
        },
      ],
      error: null,
    };
    const [member] = await getMyCareTeam();
    expect(member.displayName).toBeNull();
  });

  // T7
  it("erro da RPC é PROPAGADO, não vira equipe vazia", async () => {
    db.rpc = { data: null, error: { code: "42501", message: "permission denied" } };
    await expect(getMyCareTeam()).rejects.toMatchObject({ code: "42501" });
  });

  // T8
  it("resposta vazia → []", async () => {
    db.rpc = { data: [], error: null };
    expect(await getMyCareTeam()).toEqual([]);
  });

  it("data nula sem erro também → []", async () => {
    db.rpc = { data: null, error: null };
    expect(await getMyCareTeam()).toEqual([]);
  });
});
