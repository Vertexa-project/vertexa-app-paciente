import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

export interface LogActivityEventInput {
  patientId: string;
  type: string;
  payload?: Record<string, unknown> | null;
}

/**
 * Inserts a row into activity_events (anon key). patientId must be patients.id.
 * This is the "patient executes -> record" half of the retention loop.
 */
export async function logActivityEvent({
  patientId,
  type,
  payload,
}: LogActivityEventInput): Promise<void> {
  const { error } = await supabase.from("activity_events").insert({
    patient_id: patientId,
    type,
    payload: payload ?? {},
  });
  if (error) throw error;
}

/**
 * Lê os activity_events do paciente com created_at >= `since` (Date ou ISO), só type+created_at.
 * Base das derivações de PROGRESSO (S4): constância mensal (dias ativos distintos) e nº de treinos.
 * Só leitura; ordem decrescente. Vazio quando não há paciente resolvido.
 */
export async function getActivityEventsSince(
  since: Date | string,
): Promise<{ type: string; created_at: string }[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const sinceIso = typeof since === "string" ? since : since.toISOString();
  const { data, error } = await supabase
    .from("activity_events")
    .select("type, created_at")
    .eq("patient_id", patientId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as { type: string; created_at: string }[];
}