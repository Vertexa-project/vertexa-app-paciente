// Resumo da semana (PDF do Ernâni, tela 17). Funções PURAS. Semana = segunda a domingo, no fuso local.
// "kcal estimadas" = treino concluído (minutos estimados × 6, a mesma estimativa da tela de treino) + calorias
// informadas nas atividades complementares. Não é gasto energético medido — o rótulo diz "estimadas".
import { localDateKey } from "@/lib/pendingLogic";

export const WEEKDAY_SHORT = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;

/** Segunda-feira (00:00 local) da semana que contém `d`. */
export function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (s.getDay() + 6) % 7; // seg=0 … dom=6
  s.setDate(s.getDate() - dow);
  return s;
}

export function weekDays(start: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => localDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

export interface WorkoutDone { day: string; kcal: number }
export interface SessionKcal { day: string; kcal: number }

export interface WeeklyInputs {
  today: Date;
  workouts: WorkoutDone[];        // treinos concluídos (qualquer semana)
  sessions: SessionKcal[];        // atividades complementares
  plannedWorkoutDays: number;     // dias de treino na ficha (0 = sem ficha)
  mealLogs: { consumed_on: string }[]; // marcas de refeição feitas (qualquer semana)
  mealsPerDay: number;            // refeições do plano (0 = sem plano)
  streak: number;
  score: number | null;
  scoreAtWeekStart: number | null;
}

export interface WeeklySummary {
  rangeStart: string; rangeEnd: string;
  isClosed: boolean;               // hoje é domingo (ou depois): semana fechada
  kcalByDay: number[];             // 7 valores (dias futuros = 0)
  kcalTotal: number;
  kcalAvgPerDay: number | null;    // média sobre os dias já passados (incl. hoje)
  kcalVsPrevPct: number | null;    // % vs semana anterior; null sem base
  workoutsDone: number;            // dias distintos com treino na semana
  workoutsPlanned: number;
  streak: number;
  vriDelta: number | null;
  score: number | null;
  mealsPct: number | null;
}

const sumBy = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((a, r) => a + pick(r), 0);

export function buildWeeklySummary(i: WeeklyInputs): WeeklySummary {
  const start = weekStart(i.today);
  const days = weekDays(start);
  const prevStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
  const prevDays = weekDays(prevStart);
  const todayKey = localDateKey(i.today);
  const elapsed = Math.max(1, days.filter((d) => d <= todayKey).length);

  const kcalOn = (day: string) =>
    sumBy(i.workouts.filter((w) => w.day === day), (w) => w.kcal) + sumBy(i.sessions.filter((s) => s.day === day), (s) => s.kcal);
  const kcalByDay = days.map((d) => (d <= todayKey ? kcalOn(d) : 0));
  const kcalTotal = sumBy(kcalByDay, (n) => n);
  const prevTotal = sumBy(prevDays, kcalOn);

  const workoutsDone = new Set(i.workouts.filter((w) => days.includes(w.day)).map((w) => w.day)).size;
  const mealsDone = i.mealLogs.filter((m) => days.includes(m.consumed_on) && m.consumed_on <= todayKey).length;
  const mealsExpected = i.mealsPerDay * elapsed;

  return {
    rangeStart: days[0], rangeEnd: days[6],
    isClosed: todayKey >= days[6],
    kcalByDay, kcalTotal,
    kcalAvgPerDay: kcalTotal > 0 ? Math.round(kcalTotal / elapsed) : null,
    kcalVsPrevPct: prevTotal > 0 ? Math.round(((kcalTotal - prevTotal) / prevTotal) * 100) : null,
    workoutsDone, workoutsPlanned: i.plannedWorkoutDays,
    streak: i.streak,
    vriDelta: i.score !== null && i.scoreAtWeekStart !== null ? i.score - i.scoreAtWeekStart : null,
    score: i.score,
    mealsPct: mealsExpected > 0 ? Math.min(100, Math.round((mealsDone / mealsExpected) * 100)) : null,
  };
}

/** Último VRI conhecido até o fim do dia anterior ao início da semana (histórico em ordem decrescente). */
export function scoreBefore(historyDesc: { score: number; at: string }[], start: Date): number | null {
  const cutoff = start.getTime();
  const row = historyDesc.find((r) => new Date(r.at).getTime() < cutoff);
  return row ? row.score : null;
}

/** "21 a 27 out" / "28 set a 4 out". */
export function rangeLabel(startKey: string, endKey: string): string {
  const mon = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const day = (k: string) => Number(k.slice(8, 10));
  return mon(startKey) === mon(endKey) ? `${day(startKey)} a ${day(endKey)} ${mon(endKey)}` : `${day(startKey)} ${mon(startKey)} a ${day(endKey)} ${mon(endKey)}`;
}
