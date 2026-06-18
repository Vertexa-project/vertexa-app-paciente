import { supabase } from "@/lib/supabase";
import type { AdherenceState } from "@/lib/adherenceEngine";

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