// Tela da sequência (PDF do Ernâni, tela 07). PURO. Regra DESTE app hoje (a do servidor): um dia conta quando há
// qualquer registro de adesão da paciente (treino, refeição, suplemento, água, sono, peso, foto, humor, atividade);
// abrir o app e pedir ajuda (SOS) não contam; dia de descanso marcado não quebra a sequência.
import { localDateKey } from "@/lib/pendingLogic";
import { weekDays, weekStart } from "@/lib/weeklySummary";

export const STREAK_MILESTONES = [7, 14, 30, 60, 90] as const;

const NOT_ADHERENCE = new Set(["help_requested"]);

export type DayState = "done" | "rest" | "missed" | "today" | "future";

/** Estado de cada dia (seg→dom) da semana de `today`. "today" = hoje ainda sem registro. */
export function weekStates(events: { type: string; created_at: string }[], restDays: string[], today: Date): { day: string; state: DayState }[] {
  const days = weekDays(weekStart(today));
  const todayKey = localDateKey(today);
  const active = new Set(events.filter((e) => !NOT_ADHERENCE.has(e.type)).map((e) => localDateKey(new Date(e.created_at))));
  const rest = new Set(restDays);
  return days.map((day) => {
    let state: DayState;
    if (day > todayKey) state = "future";
    else if (active.has(day)) state = "done";
    else if (rest.has(day)) state = "rest";
    else state = day === todayKey ? "today" : "missed";
    return { day, state };
  });
}

export function nextStreakMilestone(streak: number): { target: number; remaining: number } | null {
  const target = STREAK_MILESTONES.find((m) => streak < m);
  return target ? { target, remaining: target - streak } : null;
}
