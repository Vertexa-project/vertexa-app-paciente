import { supabase } from "@/lib/supabase";
import type { MuscleRecoveryState } from "./types";

/**
 * Lê o estado de recuperação persistido do paciente (uma linha por muscle_group). WP-RLS2: a coluna
 * `status` agora é VERDADEIRA (o servidor recalcula por `last_trained_at` — trigger no treino +
 * pg_cron diário). O app NÃO grava mais recuperação (lockdown); só LÊ. O body map pode pintar pelo
 * `status` do servidor ou re-derivar de `last_trained_at` (recoveryRule.ts) — ambos coincidem.
 * Retorna [] quando não há patientId/linhas.
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