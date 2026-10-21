import { useQuery } from "@tanstack/react-query";
import {
  getLatestAdherenceState, getAdherenceHistory, getActivitySessionsSince, getWorkoutCompletionsSince,
  getMealLogsSince, getMealAdherenceToday, getMyWorkoutPlan,
} from "@/lib/api";
import { localDateKey } from "@/lib/pendingLogic";
import { buildWeeklySummary, scoreBefore, weekStart, type WeeklySummary } from "@/lib/weeklySummary";

/** Resumo da semana atual (segunda→domingo) com a semana anterior de base. Só leitura; nada é recalculado no servidor. */
export function useWeeklySummary(): { summary: WeeklySummary | null; isLoading: boolean; isError: boolean; refetch: () => void } {
  const today = new Date();
  const start = weekStart(today);
  const prevStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
  const key = localDateKey(today);

  const adherence = useQuery({ queryKey: ["adherence"], queryFn: getLatestAdherenceState });
  const history = useQuery({ queryKey: ["adherenceHistory"], queryFn: () => getAdherenceHistory(60) });
  const sessions = useQuery({ queryKey: ["weekly", "sessions", key], queryFn: () => getActivitySessionsSince(prevStart) });
  const done = useQuery({ queryKey: ["weekly", "workouts", key], queryFn: () => getWorkoutCompletionsSince(prevStart) });
  const meals = useQuery({ queryKey: ["weekly", "meals", key], queryFn: () => getMealLogsSince(localDateKey(start)) });
  const mealsToday = useQuery({ queryKey: ["mealAdherenceToday"], queryFn: getMealAdherenceToday });
  const plan = useQuery({ queryKey: ["workoutPlan"], queryFn: getMyWorkoutPlan });

  const queries = [adherence, history, sessions, done, meals, mealsToday, plan];
  const isLoading = queries.some((q) => q.isPending);
  const isError = queries.some((q) => q.isError);
  if (isLoading || isError) return { summary: null, isLoading, isError, refetch: () => queries.forEach((q) => void q.refetch()) };

  const kcalByWorkout = new Map((plan.data ?? []).map((w) => [w.id, w.estimatedCalories]));
  const summary = buildWeeklySummary({
    today,
    workouts: (done.data ?? []).map((w) => ({ day: localDateKey(new Date(w.created_at)), kcal: w.workoutId ? kcalByWorkout.get(w.workoutId) ?? 0 : 0 })),
    sessions: (sessions.data ?? []).map((s) => ({ day: localDateKey(new Date(s.performed_at)), kcal: s.calories ?? 0 })),
    plannedWorkoutDays: plan.data?.length ?? 0,
    mealLogs: meals.data ?? [],
    mealsPerDay: mealsToday.data?.total ?? 0,
    streak: adherence.data?.streak ?? 0,
    score: adherence.data?.score ?? null,
    scoreAtWeekStart: scoreBefore(history.data ?? [], start),
  });
  return { summary, isLoading: false, isError: false, refetch: () => undefined };
}
