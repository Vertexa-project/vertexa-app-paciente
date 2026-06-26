import { supabase } from "@/lib/supabase";
import type { CanonicalMuscle, MuscleRecoveryState, MuscleStatus } from "./types";

/**
 * Lê o estado de recuperação persistido do paciente (uma linha por muscle_group).
 * RLS sprint (`sprint_read_all`) já permite SELECT anon. O body map dinâmico consome isto
 * e DERIVA o status exibido de `last_trained_at` (ver recoveryRule.ts) — a coluna `status`
 * é provisória (pendência #1) e não decai sozinha. Retorna [] quando não há patientId/linhas.
 */
export async function getMuscleRecovery(patientId: string): Promise<MuscleRecoveryState[]> {
  if (!patientId) return [];
  const { data, error } = await supabase
    .from("muscle_recovery_states")
    .select("id, patient_id, muscle_group, last_trained_at, last_intensity, status, calculated_at")
    .eq("patient_id", patientId);
  if (error) throw error;
  return (data as MuscleRecoveryState[]) ?? [];
}

export interface UpsertMuscleRecoveryInput {
  patientId: string;
  muscles: CanonicalMuscle[];
  status?: MuscleStatus;
  lastIntensity?: number;
}

const DEFAULT_STATUS: MuscleStatus = "fatigued";
const DEFAULT_INTENSITY = 70;

/**
 * Upserts recovery rows for the given canonical muscles (PROVISIONAL, pendencia #1).
 * Freshly trained muscles become 'fatigued'. Unique key: (patient_id, muscle_group).
 * The web BodyMap reads this and paints fatigued = red.
 */
export async function upsertMuscleRecovery({
  patientId,
  muscles,
  status = DEFAULT_STATUS,
  lastIntensity = DEFAULT_INTENSITY,
}: UpsertMuscleRecoveryInput): Promise<void> {
  if (muscles.length === 0) return;
  const now = new Date().toISOString();
  const rows = muscles.map((muscle_group) => ({
    patient_id: patientId,
    muscle_group,
    last_trained_at: now,
    last_intensity: lastIntensity,
    status,
    calculated_at: now,
  }));
  const { error } = await supabase
    .from("muscle_recovery_states")
    .upsert(rows, { onConflict: "patient_id,muscle_group" });
  if (error) throw error;
}