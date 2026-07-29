import { describe, expect, it } from "vitest";

import { careTeamLabel } from "./careTeam";
import type { ChannelProfessional } from "@/lib/api/types";

function prof(name: string): ChannelProfessional {
  return { profileId: `p-${name}`, name, specialty: null, type: null, disciplines: [] };
}

describe("careTeamLabel — nome real ou nada", () => {
  it("sem ninguém: null (a tela decide o estado vazio, o rótulo não inventa)", () => {
    expect(careTeamLabel([])).toBeNull();
  });

  it("um profissional: o nome, cru", () => {
    expect(careTeamLabel([prof("Bruno Salles")])).toBe("Bruno Salles");
  });

  // Produção: Mariana tem DOIS vínculos ativos (Bruno Salles e Ana Prado). Eleger um deles como
  // "o responsável" seria inventar uma hierarquia que o banco não guarda.
  it("dois ou mais: o primeiro e a CONTAGEM do resto, sem eleger responsável", () => {
    expect(careTeamLabel([prof("Ana Prado"), prof("Bruno Salles")])).toBe("Ana Prado +1");
    expect(careTeamLabel([prof("Ana Prado"), prof("Bruno Salles"), prof("Clara Vieira")])).toBe(
      "Ana Prado +2",
    );
  });

  it("nome vazio ou só espaço não entra — nem como linha em branco, nem na contagem", () => {
    expect(careTeamLabel([prof("   "), prof("Ana Prado")])).toBe("Ana Prado");
    expect(careTeamLabel([prof("")])).toBeNull();
  });
});
