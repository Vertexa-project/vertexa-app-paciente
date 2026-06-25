import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

// Uma linha de peso auto-reportado pelo paciente (app). Espelha as colunas canônicas de
// weight_logs (CONTRATO_INTEGRACAO.md — NÃO renomear weight_kg/measured_at).
export interface WeightLogRow {
  id: string;
  patient_id: string;
  weight_kg: number;
  measured_at: string;
  source: string;
  created_at: string;
}

export interface LogWeightInput {
  weightKg: number;
  measuredAt?: string; // default: agora (coluna default now())
}

/**
 * Persiste o VALOR do peso em weight_logs com source='app' (CONTRATO #16 / Spine de dados).
 * patient_id é resolvido para patients.id. A web LÊ daqui (gráfico, ponto laranja = app).
 * activity_events(type='weight_logged') permanece apenas como MARCADOR de Timeline.
 */
export async function logWeight({ weightKg, measuredAt }: LogWeightInput): Promise<WeightLogRow> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");

  const row: Record<string, unknown> = {
    patient_id: patientId,
    weight_kg: weightKg,
    source: "app",
  };
  if (measuredAt) row.measured_at = measuredAt;

  const { data, error } = await supabase
    .from("weight_logs")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as WeightLogRow;
}

/**
 * Pesos auto-reportados mais recentes (app), em ordem decrescente por measured_at.
 * Usado no "Histórico recente" da tela de Registros (substitui o array hardcoded).
 */
export async function getRecentWeightLogs(limit = 6): Promise<WeightLogRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("patient_id", patientId)
    .order("measured_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WeightLogRow[];
}
