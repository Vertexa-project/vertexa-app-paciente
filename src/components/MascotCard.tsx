import { useQuery } from "@tanstack/react-query";
import { motion, useAnimationControls } from "framer-motion";
import { Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import tigre from "@/assets/mascot/tigre.webp";
import { useClinicBrand } from "@/hooks/useClinicBrand";
import {
  getHydrationTodayLiters,
  getLatestAdherenceState,
  getMealAdherenceToday,
  getMyWorkoutPlan,
  getPendingSummary,
  getMySupplements,
  getSupplementsTakenToday,
} from "@/lib/api";
import { WATER_GOAL_LITERS } from "@/lib/hydrationMath";
import { accessibleAccent } from "@/lib/mascot/brandAccent";
import { mascotSpeech, shouldCelebrate, type MascotGoal } from "@/lib/mascot/mascotRules";
import { localDateKey } from "@/lib/pendingLogic";
import { readSeenDone, writeSeenDone } from "@/lib/mascot/seenDone";

/**
 * Metas do dia COM DADO REAL para o tigrezinho (mesmas queries/chaves da Home → cache compartilhado, sem leitura nova).
 * Meta sem dado (sem plano de refeição, sem treino publicado, sem remédio cadastrado, leitura que falhou) fica fora.
 */
function useMascotGoals(): { goals: MascotGoal[]; streak: number | null; ready: boolean } {
  const hydration = useQuery({ queryKey: ["hydrationToday"], queryFn: getHydrationTodayLiters });
  const meals = useQuery({ queryKey: ["mealAdherenceToday"], queryFn: getMealAdherenceToday });
  const plan = useQuery({ queryKey: ["workoutPlan"], queryFn: getMyWorkoutPlan });
  const pending = useQuery({ queryKey: ["pendingSummary"], queryFn: getPendingSummary });
  const adherence = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const supplements = useQuery({ queryKey: ["supplements"], queryFn: getMySupplements });
  const todayKey = localDateKey(new Date());
  const hasSupplements = (supplements.data?.length ?? 0) > 0;
  const taken = useQuery({
    queryKey: ["supplementsTakenToday", todayKey],
    queryFn: getSupplementsTakenToday,
    enabled: hasSupplements,
  });

  const goals: MascotGoal[] = [];
  if (typeof hydration.data === "number") goals.push({ id: "water", current: hydration.data, target: WATER_GOAL_LITERS });
  if (meals.data && meals.data.total > 0) goals.push({ id: "meals", current: meals.data.done, target: meals.data.total });
  if ((plan.data?.length ?? 0) > 0 && pending.data) goals.push({ id: "workout", current: pending.data.workoutPending ? 0 : 1, target: 1 });
  if (hasSupplements && taken.data) {
    const done = (supplements.data ?? []).filter((s) => taken.data.has(s.id)).length;
    goals.push({ id: "meds", current: done, target: supplements.data!.length });
  }
  const queries = [hydration, meals, plan, pending, supplements];
  const ready = queries.every((q) => !q.isPending) && (!hasSupplements || !taken.isPending);
  return { goals, streak: adherence.data?.streak ?? null, ready };
}

/** Tigrezinho: mascote que acompanha as metas do dia, na cor da clínica. Fala determinística (sem IA), só sobre metas e sequência. */
export default function MascotCard() {
  const { goals, streak, ready } = useMascotGoals();
  const { data: brand } = useClinicBrand();
  const accent = accessibleAccent(brand?.color);
  const speech = useMemo(() => mascotSpeech({ streak, goals }), [streak, goals]);
  const controls = useAnimationControls();
  const [celebrations, setCelebrations] = useState(0);
  const prevDone = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    const day = localDateKey(new Date());
    // 1ª leitura desta montagem: compara com o que ele já tinha visto hoje (volta da tela de registro).
    if (prevDone.current === undefined) prevDone.current = readSeenDone(day);
    if (shouldCelebrate(prevDone.current, speech.doneCount)) {
      setCelebrations((n) => n + 1);
      // Efeito sempre ligado (sem toggle, não para com reduced-motion — regra do Lucas).
      void controls.start({ scale: [1, 1.22, 0.94, 1.1, 1], rotate: [0, -10, 9, -4, 0], y: [0, -8, 0, -3, 0], transition: { duration: 0.9, ease: "easeInOut" } });
    }
    prevDone.current = speech.doneCount;
    writeSeenDone(day, speech.doneCount);
  }, [ready, speech.doneCount, controls]);

  return (
    <section
      aria-label="Tigrezinho, mascote das metas do dia"
      data-testid="mascot-card"
      data-accent={accent}
      data-celebrations={celebrations}
      className="mb-5 flex items-center gap-3 rounded-2xl border p-3.5"
      style={{ borderColor: `${accent}66`, backgroundColor: `${accent}1A` }}
    >
      <motion.img
        src={tigre}
        alt="Tigrezinho"
        width={56}
        height={56}
        animate={controls}
        data-testid="mascot-image"
        className="h-14 w-14 shrink-0 rounded-full bg-white object-cover"
        style={{ objectPosition: "50% 38%", border: `2px solid ${accent}` }}
      />
      <div className="min-w-0 flex-1">
        {speech.headline && (
          <p className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: accent }}>
            <Zap size={12} aria-hidden /> {speech.headline}
          </p>
        )}
        <p className="text-sm font-medium text-foreground" data-testid="mascot-line">{ready ? speech.line : "…"}</p>
        {ready && speech.total > 0 && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {speech.doneCount} de {speech.total} {speech.total === 1 ? "meta" : "metas"} de hoje
          </p>
        )}
      </div>
    </section>
  );
}
