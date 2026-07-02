import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import { getMealAdherenceToday } from "./meals";
import {
  getAdherenceState,
  deriveAdherenceConfig,
  adherenceStateFromSnapshot,
  type AdherenceState,
} from "@/lib/adherenceEngine";

export interface InsertAdherenceSnapshotInput {
  patientId: string;
  state: AdherenceState;
}

/**
 * Persists an adherence (VRI) snapshot computed by adherenceEngine. The web only reads
 * these; the app writes. patientId must be patients.id.
 */
export async function insertAdherenceSnapshot({
  patientId,
  state,
}: InsertAdherenceSnapshotInput): Promise<void> {
  const { error } = await supabase.from("adherence_snapshots").insert({
    patient_id: patientId,
    score: state.score,
    level: state.level,
    status: state.status,
    streak: state.streak,
    weekly_completion_rate: state.weeklyCompletionRate,
    risk_factors: state.riskFactors,
    positive_factors: state.positiveFactors,
  });
  if (error) throw error;
}

/**
 * VRI computed from REAL activity (objetivo #7): lê activity_events + último peso/foto do
 * paciente, monta o config com deriveAdherenceConfig e aplica a fórmula (getAdherenceState).
 * É o que o eventSync grava como snapshot ao concluir um treino — "VRI de dados reais".
 * Fallback ao DEFAULT_CONFIG (getAdherenceState()) quando não há paciente resolvido.
 */
export async function computeAdherenceFromActivity(): Promise<AdherenceState> {
  const patientId = await getMyPatientId();
  if (!patientId) return getAdherenceState();

  const [eventsRes, weightRes, photoRes, mealAdherence] = await Promise.all([
    supabase
      .from("activity_events")
      .select("type, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(500),
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
    // Adesão alimentar do dia (meal_logs vs plano ativo) — fator ADITIVO/não-negativo do VRI.
    getMealAdherenceToday(),
  ]);
  if (eventsRes.error) throw eventsRes.error;
  if (weightRes.error) throw weightRes.error;
  if (photoRes.error) throw photoRes.error;

  const config = deriveAdherenceConfig({
    events: (eventsRes.data ?? []) as { type: string; created_at: string }[],
    lastWeightAt: (weightRes.data?.measured_at as string) ?? null,
    lastPhotoAt: (photoRes.data?.taken_at as string) ?? null,
    now: new Date(),
    mealAdherenceToday: mealAdherence,
  });
  return getAdherenceState(config);
}

interface AdherenceSnapshotRow {
  score: number;
  level: AdherenceState["level"];
  status: AdherenceState["status"];
  streak: number | null;
  weekly_completion_rate: number | null;
  risk_factors: string[] | null;
  positive_factors: string[] | null;
  calculated_at: string | null;
}

/**
 * VRI exibido na Home = ÚLTIMO snapshot persistido (mesma fonte que a web lê) → app e web
 * mostram exatamente o mesmo número (consistência por construção). Usa os 2 últimos para o
 * badge de variação. Retorna null quando ainda não há snapshot (a Home cai no compute local).
 */
export async function getLatestAdherenceState(): Promise<AdherenceState | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;

  const { data, error } = await supabase
    .from("adherence_snapshots")
    .select("score, level, status, streak, weekly_completion_rate, risk_factors, positive_factors, calculated_at")
    .eq("patient_id", patientId)
    .order("calculated_at", { ascending: false })
    .limit(2);
  if (error) throw error;

  const rows = (data ?? []) as AdherenceSnapshotRow[];
  if (rows.length === 0) return null;

  const latest = rows[0];
  const prevScore = rows[1]?.score;
  return adherenceStateFromSnapshot(
    {
      score: latest.score,
      level: latest.level,
      status: latest.status,
      streak: latest.streak ?? 0,
      weeklyCompletionRate: latest.weekly_completion_rate ?? 0,
      riskFactors: latest.risk_factors ?? [],
      positiveFactors: latest.positive_factors ?? [],
    },
    prevScore
  );
}
