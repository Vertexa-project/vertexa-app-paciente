import type { RankingRow } from "@/lib/api/ranking";

/** Regras de pontos do desafio (espelham private.points_by_day no banco; teto 100 por dia). */
export const POINT_RULES: { label: string; points: number }[] = [
  { label: "Treino do dia", points: 40 },
  { label: "Refeições do plano (proporcional)", points: 30 },
  { label: "Água registrada", points: 10 },
  { label: "Suplemento tomado", points: 10 },
  { label: "Peso ou foto de evolução", points: 10 },
];
export const DAILY_CAP = 100;

export const me = (rows: RankingRow[]): RankingRow | null => rows.find((r) => r.isMe) ?? null;

/** Pontos que faltam para alcançar a próxima posição acima; null se já lidera ou não está na lista. */
export function pointsToNext(rows: RankingRow[]): number | null {
  const mine = me(rows);
  if (!mine || mine.position === 1) return null;
  const above = rows.filter((r) => r.points > mine.points).map((r) => r.points);
  return above.length ? Math.min(...above) - mine.points : null;
}

export const positionLabel = (p: number) => `${p}º`;
