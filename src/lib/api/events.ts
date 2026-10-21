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
/** Treinos CONCLUÍDOS (workout_checked/action=completed) desde `since`: quando e qual treino. Só leitura. */
export async function getWorkoutCompletionsSince(since: Date | string): Promise<{ created_at: string; workoutId: string | null }[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];
  const sinceIso = typeof since === "string" ? since : since.toISOString();
  const { data, error } = await supabase
    .from("activity_events")
    .select("created_at, payload")
    .eq("patient_id", patientId)
    .eq("type", "workout_checked")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as { created_at: string; payload: Record<string, unknown> | null }[])
    .filter((r) => r.payload?.action === "completed")
    .map((r) => ({ created_at: r.created_at, workoutId: typeof r.payload?.workoutId === "string" ? (r.payload.workoutId as string) : null }));
}
