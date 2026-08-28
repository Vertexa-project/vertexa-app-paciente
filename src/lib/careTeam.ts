// Exibição da equipe clínica no Perfil (WP-09B2).
//
// UM LUGAR SÓ decide fallback de nome e iniciais. A fonte dos dados é
// `getMyCareTeam` (lib/api/careTeam.ts) — RPC public.get_my_care_team, sem canal.

import type { CareTeamMember } from "@/lib/api/types";

/** Mesmo fallback que o roster do chat usa quando o nome não veio. */
export const CARE_TEAM_NAME_FALLBACK = "Profissional";

export function careTeamDisplayName(member: Pick<CareTeamMember, "displayName">): string {
  return member.displayName?.trim() || CARE_TEAM_NAME_FALLBACK;
}

export function careTeamInitials(member: Pick<CareTeamMember, "displayName">): string {
  const name = careTeamDisplayName(member);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
