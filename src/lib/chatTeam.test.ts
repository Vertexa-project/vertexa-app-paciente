import { describe, expect, it } from "vitest";

import {
  DISCIPLINE_NOT_INFORMED,
  disciplineLabel,
  professionalDisciplineLabel,
  teamReadsLabel,
} from "./chatTeam";

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
