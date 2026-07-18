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
