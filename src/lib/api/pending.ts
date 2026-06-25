import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import { derivePending, type PendingState } from "@/lib/pendingLogic";

/**
 * Resolve as pendências da Home a partir de dados REAIS:
 * - último weight_logs.measured_at (peso atrasado),
 * - última progress_photos.taken_at (foto do mês),
 * - existe workout_checked hoje? (treino do dia).
 * Retorna um estado "tudo pendente" quando não há paciente resolvido (fail-safe conservador).
 */
export async function getPendingSummary(): Promise<PendingState> {
  const now = new Date();
  const patientId = await getMyPatientId();
  if (!patientId) {
    return derivePending({ lastWeightAt: null, lastPhotoAt: null, workoutTodayAt: null, now });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [weightRes, photoRes, workoutRes] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("measured_at")
      .eq("patient_id", patientId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("progress_photos")
      .select("taken_at")
      .eq("patient_id", patientId)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("activity_events")
      .select("created_at")
      .eq("patient_id", patientId)
      .eq("type", "workout_checked")
      .gte("created_at", startOfToday.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (weightRes.error) throw weightRes.error;
  if (photoRes.error) throw photoRes.error;
  if (workoutRes.error) throw workoutRes.error;

  return derivePending({
    lastWeightAt: (weightRes.data?.measured_at as string) ?? null,
    lastPhotoAt: (photoRes.data?.taken_at as string) ?? null,
    workoutTodayAt: (workoutRes.data?.created_at as string) ?? null,
    now,
  });
}
