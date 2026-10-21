import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import { adherenceStateFromSnapshot, type AdherenceState } from "@/lib/adherenceEngine";

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
 * VRI exibido na Home = ÚLTIMO snapshot persistido (mesma fonte que a web lê) → app e web mostram
 * exatamente o mesmo número. Usa os 2 últimos para o badge de variação. Retorna null quando ainda
 * não há snapshot (a Home cai no compute local de EXIBIÇÃO). WP-RLS2: o snapshot é escrito SOMENTE
 * pelo servidor (RPC recompute_adherence) — o app só LÊ.
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

/** Histórico do VRI (snapshots, só leitura), do mais novo ao mais antigo. O servidor só grava quando o score/nível muda. */
export async function getAdherenceHistory(limit = 60): Promise<{ score: number; at: string }[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];
  const { data, error } = await supabase
    .from("adherence_snapshots")
    .select("score, calculated_at")
    .eq("patient_id", patientId)
    .order("calculated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as { score: number; calculated_at: string | null }[])
    .filter((r) => r.calculated_at)
    .map((r) => ({ score: r.score, at: r.calculated_at as string }));
}

export interface StreakSummary {
  streak: number;
  /** Maior sequência de todos os tempos (nunca menor que a atual). */
  best: number;
  /** Dias de falha perdoados nos últimos 14 dias (yyyy-mm-dd). */
  protected: string[];
}

/** Sequência calculada agora pelo servidor (regra: 1 falha perdoada por semana), recorde e dias protegidos. */
export async function getStreakSummary(): Promise<StreakSummary | null> {
  const { data, error } = await supabase.rpc("my_streak_summary");
  if (error) throw error;
  if (!data) return null;
  const d = data as { streak?: number; best?: number; protected?: string[] };
  return { streak: Number(d.streak ?? 0), best: Number(d.best ?? 0), protected: Array.isArray(d.protected) ? d.protected : [] };
}
