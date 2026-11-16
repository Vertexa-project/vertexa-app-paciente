// Números do treino mostrados ao paciente — PUROS. Nunca "0 Min / 0 kcal": sem dado, estima honestamente ou esconde.
import type { Exercise } from "@/data/workoutData";

/** Tempo de execução de uma série (segundos) usado só na estimativa quando o treino não traz a duração. */
export const SECONDS_PER_SET = 40;
/** kcal por minuto de treino de força (estimativa simples; o cadastro não traz calorias). */
export const KCAL_PER_MINUTE = 6;

/** Estimativa: séries × (execução + intervalo). 0 quando não há exercício. Mínimo de 1 min se há exercício. */
export function estimateMinutes(exercises: Array<Pick<Exercise, "sets" | "restSeconds">>): number {
  const seconds = exercises.reduce((sum, e) => sum + e.sets.length * (SECONDS_PER_SET + Math.max(0, e.restSeconds || 0)), 0);
  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
}

/** Duração do treino: a do cadastro quando existe (> 0); senão, a estimativa pelas séries. */
export function workoutMinutes(plannedMinutes: number | null | undefined, exercises: Array<Pick<Exercise, "sets" | "restSeconds">>): number {
  return plannedMinutes && plannedMinutes > 0 ? Math.round(plannedMinutes) : estimateMinutes(exercises);
}

export function estimateKcal(minutes: number): number {
  return minutes > 0 ? Math.round(minutes * KCAL_PER_MINUTE) : 0;
}

/** "1 exercício • ~15 min • ~90 kcal" — só o que existe, com a contagem REAL de exercícios. */
export function workoutSummaryLine(w: { exercises: unknown[]; estimatedMinutes: number; estimatedCalories: number }): string {
  const n = w.exercises.length;
  const parts = [`${n} ${n === 1 ? "exercício" : "exercícios"}`];
  if (w.estimatedMinutes > 0) parts.push(`~${w.estimatedMinutes} min`);
  if (w.estimatedCalories > 0) parts.push(`~${w.estimatedCalories} kcal`);
  return parts.join(" • ");
}

/** Preparação (aquecimento): "5 movimentos" — é da preparação, não a contagem de exercícios do treino. */
export function warmupCountLabel(n: number): string {
  return `${n} ${n === 1 ? "movimento" : "movimentos"} de preparação`;
}
