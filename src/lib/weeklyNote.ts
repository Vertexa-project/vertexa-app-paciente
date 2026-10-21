// Recado do Resumo da semana (PDF do Ernâni, tela 17). Recado escrito pela equipe vence; sem ele, texto AUTOMÁTICO
// por faixa de desempenho, sempre rotulado como automático (não finge ser da equipe).
import type { WeeklySummary } from "@/lib/weeklySummary";

export type NoteBand = "forte" | "boa" | "leve" | "andamento" | "inicio";

/**
 * Faixa pelo cumprimento do plano na semana: média entre treinos concluídos/previstos e refeições registradas.
 * Antes do 4º dia de uma semana ainda aberta a faixa fica "andamento" (a semana não permite julgar).
 */
export function noteBand(s: WeeklySummary, elapsedDays: number): NoteBand {
  if (!s.isClosed && elapsedDays < 4) return "andamento";
  const parts: number[] = [];
  if (s.workoutsPlanned > 0) parts.push(Math.min(1, s.workoutsDone / s.workoutsPlanned));
  if (s.mealsPct !== null) parts.push(s.mealsPct / 100);
  if (parts.length === 0) return s.workoutsDone > 0 || s.kcalTotal > 0 ? "boa" : "inicio";
  const ratio = parts.reduce((a, b) => a + b, 0) / parts.length;
  return ratio >= 0.8 ? "forte" : ratio >= 0.5 ? "boa" : "leve";
}

const AUTO_TEXT: Record<NoteBand, string> = {
  forte: "Semana forte! Você manteve o ritmo do seu plano. Continue assim.",
  boa: "Boa semana. Já dá para ver constância: um pequeno ajuste e a próxima fica ainda melhor.",
  leve: "Semana mais leve, e tudo bem. Escolha uma coisa do plano para fazer hoje e retome o ritmo.",
  andamento: "Semana em andamento. Veja como está e planeje os próximos dias.",
  inicio: "Semana nova começando. Um registro hoje já coloca você em movimento.",
};

export interface WeeklyNote { text: string; source: "team" | "auto" }

export function weeklyNote(s: WeeklySummary, teamNote: string | null, elapsedDays: number): WeeklyNote {
  const t = teamNote?.trim();
  return t ? { text: t, source: "team" } : { text: AUTO_TEXT[noteBand(s, elapsedDays)], source: "auto" };
}
