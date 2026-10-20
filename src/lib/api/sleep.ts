import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

export interface SleepLogRow {
  id: string;
  patient_id: string;
  slept_on: string; // aaaa-mm-dd — dia em que acordou
  hours: number;
  quality: number | null;
}

export interface LogSleepInput {
  hours: number;
  quality: number | null;
  /** dia em que acordou (aaaa-mm-dd); padrão: hoje. */
  day: string;
}

/**
 * Grava o sono do dia em sleep_logs (1 registro por dia). Se o dia já tem registro, CORRIGE horas e
 * qualidade (UPDATE só nessas colunas — o banco não deixa mexer em paciente/dia).
 * activity_events NÃO é usado: um evento "sleep_logged" contaria como dia ativo no VRI/sequência.
 */
export async function logSleep({ hours, quality, day }: LogSleepInput): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");

  const { error } = await supabase.from("sleep_logs").insert({ patient_id: patientId, slept_on: day, hours, quality });
  if (!error) return;
  if (error.code !== "23505") throw error;
  const { error: upErr } = await supabase
    .from("sleep_logs")
    .update({ hours, quality, updated_at: new Date().toISOString() })
    .eq("patient_id", patientId)
    .eq("slept_on", day);
  if (upErr) throw upErr;
}

/** Últimos registros de sono do paciente (mais recente primeiro). */
export async function getRecentSleep(limit = 7): Promise<SleepLogRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("id, patient_id, slept_on, hours, quality")
    .eq("patient_id", patientId)
    .order("slept_on", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, hours: Number(r.hours) })) as SleepLogRow[];
}
