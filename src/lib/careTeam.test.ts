import { describe, expect, it } from "vitest";

import { CARE_TEAM_NAME_FALLBACK, careTeamDisplayName, careTeamInitials } from "./careTeam";
import type { CareTeamMember } from "@/lib/api/types";

function member(displayName: string | null): Pick<CareTeamMember, "displayName"> {
  return { displayName };
}

describe("careTeamDisplayName", () => {
  it("usa o display_name cru quando existe", () => {
    expect(careTeamDisplayName(member("Bruno Salles"))).toBe("Bruno Salles");
  });

  it("null/vazio/espaço cai no fallback existente, nunca num nome hardcoded de pessoa", () => {
    expect(careTeamDisplayName(member(null))).toBe(CARE_TEAM_NAME_FALLBACK);
    expect(careTeamDisplayName(member(""))).toBe(CARE_TEAM_NAME_FALLBACK);
    expect(careTeamDisplayName(member("   "))).toBe(CARE_TEAM_NAME_FALLBACK);
    expect(CARE_TEAM_NAME_FALLBACK).toBe("Profissional");
    expect(careTeamDisplayName(member(null))).not.toMatch(/Camila|Juliana/);
  });
});

describe("careTeamInitials — fallback quando avatar_url é null", () => {
  it("nome composto: primeira e última iniciais", () => {
    expect(careTeamInitials(member("Bruno Salles"))).toBe("BS");
    expect(careTeamInitials(member("Ana Prado"))).toBe("AP");
  });

  it("nome único: duas primeiras letras", () => {
    expect(careTeamInitials(member("Ana"))).toBe("AN");
  });

  it("sem nome: iniciais do fallback, não um espaço em branco", () => {
    expect(careTeamInitials(member(null))).toBe("PR");
  });
});
