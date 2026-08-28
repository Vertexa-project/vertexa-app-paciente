import { supabase } from "@/lib/supabase";
import type { CareTeamMember, ProfessionalType } from "./types";

/**
 * Equipe clínica ATIVA da paciente autenticada (WP-09B2).
 *
 * Fonte: public.get_my_care_team() — zero argumentos. O patient_id sai do JWT
 * (private.current_patient_id()). NÃO passa por chat_channels / getMyChannel /
 * channel_professionals: paciente com vínculo e sem canal ainda vê a equipe.
 *
 * A RPC já filtra link ativo, não-externo e professional ativo. Este cliente
 * mapeia o payload; não recria essa regra.
 *
 * Erro PROPAGA — quem chama distingue "falhou" de "equipe vazia".
 *
 * Tipos: este app não gera Database types (src/lib/api/types.ts é manuscrito).
 * O mapeamento usa um row type local, o mesmo padrão de listChannelProfessionals
 * — sem `as any` e sem gerar centenas de linhas.
 */

interface RawCareTeamRow {
  professional_id: string;
  profile_id: string;
  display_name: string | null;
  avatar_url: string | null;
  type: ProfessionalType | null;
  specialty: string | null;
  disciplines: string[] | null;
}

function mapCareTeamMember(row: RawCareTeamRow): CareTeamMember {
  const displayName = row.display_name?.trim() || null;
  return {
    professionalId: row.professional_id,
    profileId: row.profile_id,
    displayName,
    avatarUrl: row.avatar_url ?? null,
    type: row.type,
    specialty: row.specialty,
    disciplines: row.disciplines ?? [],
  };
}

export async function getMyCareTeam(): Promise<CareTeamMember[]> {
  const { data, error } = await supabase.rpc("get_my_care_team");
  if (error) throw error;
  const rows = (data ?? []) as unknown as RawCareTeamRow[];
  return rows.map(mapCareTeamMember);
}
