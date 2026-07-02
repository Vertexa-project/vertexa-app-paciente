// Derivação PURA e DETERMINÍSTICA da constância (S4). Substitui o Math.random do bloco "Constância
// mensal" do Progresso, que mudava a cada render. Mesma entrada (events, now, windowDays) => mesma
// saída SEMPRE. Sem Supabase, sem Date.now() interno, sem aleatoriedade -> testável e estável no reload.
import { daysAgoLocal, localDateKey } from "@/lib/pendingLogic";

export interface ConstancyDay {
  dateKey: string; // YYYY-MM-DD local
  active: boolean; // houve >=1 activity_event nesse dia local?
}

export interface Constancy {
  windowDays: number;
  activeCount: number;
  rate: number; // 0..100 (activeCount / windowDays)
  days: ConstancyDay[]; // do mais ANTIGO ao mais RECENTE; length === windowDays
}

/**
 * Dias ativos = dias LOCAIS distintos com >=1 activity_event na janela [hoje-(windowDays-1) .. hoje].
 * Qualquer tipo de evento conta (hidratação, treino, refeição-marcador, etc.). O grid tem exatamente
 * windowDays células (mais antiga -> mais recente), cada uma ativa/inativa. Determinístico.
 */
export function deriveConstancy(
  events: { created_at: string }[],
  now: Date,
  windowDays: number,
): Constancy {
  const active = new Set<string>();
  for (const e of events) {
    const d = daysAgoLocal(e.created_at, now);
    if (d >= 0 && d <= windowDays - 1) active.add(localDateKey(new Date(e.created_at)));
  }

  const days: ConstancyDay[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateKey = localDateKey(day);
    days.push({ dateKey, active: active.has(dateKey) });
  }

  const activeCount = days.reduce((n, d) => n + (d.active ? 1 : 0), 0);
  const rate = windowDays > 0 ? Math.round((activeCount / windowDays) * 100) : 0;
  return { windowDays, activeCount, rate, days };
}

/**
 * Nº de DIAS distintos com treino (workout_checked) na janela [hoje-(windowDays-1) .. hoje].
 * Conta DIAS distintos (não eventos brutos) DE PROPÓSITO: o WorkoutGuide emite 2 workout_checked por
 * sessão (action 'started' + 'completed', ambos espelhados pelo eventSync sem olhar `action`), então
 * contar eventos brutos DOBRARIA um treino guiado. Dias distintos deduplica isso, casa com o
 * `workoutsThisWeek` do adherenceEngine e funciona com o seed (sem `action`) e o fetch (só type+created_at).
 * (NÃO implica dados de EXECUÇÃO — séries/reps/carga feitas — que não existem hoje; ver dívida S-EXEC.)
 */
export function countWorkoutDaysInWindow(
  events: { type: string; created_at: string }[],
  now: Date,
  windowDays: number,
): number {
  const days = new Set<string>();
  for (const e of events) {
    if (e.type !== "workout_checked") continue;
    if (daysAgoLocal(e.created_at, now) <= windowDays - 1) days.add(localDateKey(new Date(e.created_at)));
  }
  return days.size;
}
