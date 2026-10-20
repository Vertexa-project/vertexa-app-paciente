import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import { recomputeAchievements, recomputeAdherence } from "./metrics";

/** Dias de descanso marcados em [from, to] (aaaa-mm-dd), do paciente logado. */
export async function getRestDays(from: string, to: string): Promise<string[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];
  const { data, error } = await supabase.from("rest_days").select("rest_on").eq("patient_id", patientId).gte("rest_on", from).lte("rest_on", to);
  if (error) throw error;
  return (data ?? []).map((r) => r.rest_on as string);
}

/** Marca o dia como descanso (hoje ou ontem — o servidor recusa o resto e o 3º na semana) e recalcula a sequência. */
export async function markRestDay(day: string): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");
  const { error } = await supabase.from("rest_days").insert({ patient_id: patientId, rest_on: day });
  if (error) throw error;
  await recompute();
}

export async function undoRestDay(day: string): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");
  const { error } = await supabase.from("rest_days").delete().eq("patient_id", patientId).eq("rest_on", day);
  if (error) throw error;
  await recompute();
}

// A sequência é derivada no servidor; o recálculo é best-effort (o descanso já está gravado).
async function recompute(): Promise<void> {
  await recomputeAdherence().catch(() => undefined);
  await recomputeAchievements().catch(() => undefined);
}
