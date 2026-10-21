import { getPatient } from "./patient";
import { getAchievementsView } from "./achievements";
import { getLatestAdherenceState } from "./adherence";
import { deriveJourney, phaseForDay, type JourneyView } from "@/lib/journey";
import type { JourneyPhase } from "@/lib/adherenceEngine";

// Monta a JORNADA VIVA a partir de dados REAIS: start_date (patients) + conquistas
// (getAchievementsView, os marcos) + streak/score/fase do ÚLTIMO snapshot de VRI (getLatestAdherenceState).
// LEITURA pura — NÃO recomputa nem grava VRI, A fase vem do TEMPO de acompanhamento (phaseForDay), não mais da sequência.
export interface JourneyData extends JourneyView {
  streak: number;
  score: number | null; // VRI do snapshot real (null se ainda não há snapshot)
  level: string | null;
  phase: JourneyPhase;
}

export async function getJourneyData(): Promise<JourneyData> {
  const [patient, achievements, adherence] = await Promise.all([
    getPatient(),
    getAchievementsView(),
    getLatestAdherenceState(),
  ]);

  const view = deriveJourney({
    startDate: patient?.start_date ?? null,
    now: new Date(),
    achievements: achievements.map((a) => ({
      code: a.code,
      title: a.title,
      description: a.description,
      icon: a.icon,
      unlocked: a.unlocked,
      unlockedAt: a.unlockedAt,
    })),
  });

  const streak = adherence?.streak ?? 0;
  return {
    ...view,
    streak,
    score: adherence?.score ?? null,
    level: adherence?.level ?? null,
    phase: phaseForDay(view.dayNumber),
  };
}
