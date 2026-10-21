import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

/** Recado que a equipe escreveu para a semana que começa em `weekStartKey` (segunda, yyyy-mm-dd). null = nenhum. */
export async function getMyWeeklyNote(weekStartKey: string): Promise<string | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;
  const { data, error } = await supabase
    .from("weekly_team_notes")
    .select("body")
    .eq("patient_id", patientId)
    .eq("week_start", weekStartKey)
    .maybeSingle();
  if (error) throw error;
  return (data as { body: string } | null)?.body ?? null;
}
