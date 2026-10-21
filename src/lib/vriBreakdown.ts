// Tela do VRI (PDF do Ernâni, tela 14): "sem caixa-preta". Funções PURAS.
// O NÚMERO do VRI vem do servidor (snapshot). Aqui só se MOSTRA de onde ele vem: os 4 grupos de sinais que o
// servidor usa (treino, alimentação, suplementação, registros), cada um com o dado real do dia/semana.
// Os percentuais por grupo são leitura do que foi feito, NÃO um recálculo do índice nem somam o VRI.

export type VriComponentKey = "workout" | "meals" | "supplements" | "records";

export interface VriComponent {
  key: VriComponentKey;
  label: string;
  /** 0–100, ou null quando não há o que medir (sem plano/lista) */
  pct: number | null;
  detail: string;
}

export interface VriInputs {
  /** dias distintos com treino concluído nos últimos 7 (o servidor usa o mesmo corte) */
  workoutDaysWeek: number;
  weeklyCompletionRate: number; // já vem do snapshot: workouts/5
  hasWorkoutPlan: boolean;
  mealsDone: number;
  mealsTotal: number;
  suppTaken: number;
  suppTotal: number;
  weightDaysAgo: number | null;
  photoDaysAgo: number | null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const ratio = (a: number, b: number) => (b > 0 ? clamp((a / b) * 100) : null);

export function vriComponents(i: VriInputs): VriComponent[] {
  const weightOk = i.weightDaysAgo !== null && i.weightDaysAgo <= 7;
  const photoOk = i.photoDaysAgo !== null && i.photoDaysAgo <= 30;
  const recordsPct = clamp(((weightOk ? 1 : 0) + (photoOk ? 1 : 0)) * 50);
  return [
    {
      key: "workout", label: "Treino",
      pct: i.hasWorkoutPlan ? clamp(i.weeklyCompletionRate) : null,
      detail: i.hasWorkoutPlan ? `${Math.min(i.workoutDaysWeek, 5)} de 5 treinos na semana` : "sem ficha de treino publicada",
    },
    {
      key: "meals", label: "Alimentação", pct: ratio(i.mealsDone, i.mealsTotal),
      detail: i.mealsTotal > 0 ? `${i.mealsDone} de ${i.mealsTotal} refeições de hoje` : "sem plano alimentar publicado",
    },
    {
      key: "supplements", label: "Suplementação", pct: ratio(i.suppTaken, i.suppTotal),
      detail: i.suppTotal > 0 ? `${i.suppTaken} de ${i.suppTotal} de hoje` : "sem suplementos cadastrados",
    },
    {
      key: "records", label: "Registros de peso e foto", pct: recordsPct,
      detail: `peso ${weightOk ? "em dia" : "atrasado"} · foto ${photoOk ? "em dia" : "pendente"}`,
    },
  ];
}

const TIPS: Record<VriComponentKey, string> = {
  workout: "Concluir o treino de hoje é o que mais ajuda o seu índice agora.",
  meals: "Marcar as refeições de hoje no plano ajuda o seu índice.",
  supplements: "Marcar os suplementos de hoje ajuda o seu índice.",
  records: "Registrar o peso (a cada 7 dias) e a foto (a cada 30) ajuda o seu índice.",
};

/** Componente mais fraco entre os que têm o que medir; empate fica com o primeiro da ordem acima. */
export function weakestComponent(list: VriComponent[]): { component: VriComponent; tip: string } | null {
  const measurable = list.filter((c) => c.pct !== null);
  if (measurable.length === 0) return null;
  const weakest = measurable.reduce((a, b) => ((b.pct as number) < (a.pct as number) ? b : a));
  if ((weakest.pct as number) >= 100) return null; // nada a melhorar
  return { component: weakest, tip: TIPS[weakest.key] };
}

/** Faixas de referência do PDF: <50, 50–69, 70+. */
export function vriBand(score: number): "baixa" | "media" | "alta" {
  return score >= 70 ? "alta" : score >= 50 ? "media" : "baixa";
}

export interface VriPoint { score: number; at: string }

/** Pontos para a curva, do mais antigo ao mais novo, com no máximo `max` (os mais recentes). */
export function curvePoints(rowsDesc: VriPoint[], max = 60): VriPoint[] {
  return [...rowsDesc].slice(0, max).reverse();
}
