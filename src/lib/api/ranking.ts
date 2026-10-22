import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

export type RankingPeriod = "week" | "month";
export interface RankingRow { position: number; initials: string; points: number; activeDays: number; isMe: boolean }

/** A paciente já aceitou participar do ranking da clínica? */
export async function isInRanking(): Promise<boolean> {
  const patientId = await getMyPatientId();
  if (!patientId) return false;
  const { data, error } = await supabase.from("ranking_members").select("patient_id").eq("patient_id", patientId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function joinRanking(): Promise<void> {
  const { error } = await supabase.rpc("join_ranking");
  if (error) throw error;
}

export async function leaveRanking(): Promise<void> {
  const { error } = await supabase.rpc("leave_ranking");
  if (error) throw error;
}

export async function getClinicRanking(period: RankingPeriod): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc("clinic_ranking", { p_period: period });
  if (error) throw error;
  return ((data ?? []) as { rank_position: number; initials: string; points: number; active_days: number; is_me: boolean }[]).map((r) => ({
    position: r.rank_position, initials: r.initials, points: r.points, activeDays: r.active_days, isMe: r.is_me,
  }));
}
