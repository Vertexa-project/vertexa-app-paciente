// Motor de CONQUISTAS (S5) — PURO e DETERMINÍSTICO. Mesma entrada => mesma saída SEMPRE.
// Sem Supabase, sem Date.now() interno, sem aleatoriedade -> testável e estável no reload.
//
// ISOLAMENTO DO VRI (invariante da sprint): este motor NÃO importa nem altera o adherenceEngine
// e NÃO participa do cálculo do score/denominador. Ele só DERIVA quais conquistas estão
// destravadas a partir dos MESMOS dados reais (eventos, peso, flags de tabelas-valor) e devolve
// os `code`s — a persistência (patient_achievements) é feita fora (api/eventSync), em caminho
// separado. Conquistas não alimentam o motor de adesão.
//
// O catálogo de EXIBIÇÃO (título/ícone/descrição/categoria) é a tabela `achievements` (seed da
// migration 20260702210746) — fonte única. Aqui ficam só os CODES e as REGRAS de unlock, para
// não duplicar textos (evita drift entre DB e código).
import { localDateKey } from "@/lib/pendingLogic";

// Os 12 codes do catálogo aprovado, NA ORDEM do catálogo (sort_order). A ordem é o contrato de
// exibição da lista "todas as conquistas".
export const ACHIEVEMENT_CODES = [
  "first_workout",
  "first_weight",
  "first_photo",
  "first_meal_day",
  "first_activity",
  "first_supplement",
  "streak_7",
  "streak_14",
  "streak_30",
  "weight_3kg",
  "weight_5kg",
  "weight_target",
] as const;

export type AchievementCode = (typeof ACHIEVEMENT_CODES)[number];

// Fatos DERIVADOS de dados reais que decidem cada unlock. Montados por api/achievements.ts.
export interface AchievementFacts {
  // Nº de DIAS distintos com workout_checked (guard #13: deduplica started+completed do WorkoutGuide).
  workoutDays: number;
  hasWeightLog: boolean; // >=1 linha em weight_logs
  hasPhoto: boolean; // >=1 linha em progress_photos
  hasMealLog: boolean; // >=1 linha em meal_logs
  hasActivitySession: boolean; // >=1 linha em activity_sessions
  hasSupplementIntake: boolean; // >=1 linha em supplement_intakes
  streak: number; // dias consecutivos com >=1 evento (deriveStreak)
  kgLost: number; // patients.start_weight - current_weight (>= 0; lido do banco, D2)
  reachedTarget: boolean; // current_weight <= target_weight
}

// Limiares de peso (kg) e de streak — em UM só lugar. Batem com os `code`s do catálogo.
const WEIGHT_KG_MILESTONES: { code: AchievementCode; kg: number }[] = [
  { code: "weight_3kg", kg: 3 },
  { code: "weight_5kg", kg: 5 },
];
const STREAK_MILESTONES: { code: AchievementCode; days: number }[] = [
  { code: "streak_7", days: 7 },
  { code: "streak_14", days: 14 },
  { code: "streak_30", days: 30 },
];

/**
 * Devolve os codes DESTRAVADOS a partir dos fatos, NA ORDEM do catálogo. Monotônico por natureza
 * (mais dado só destrava mais); a persistência a jusante é UPSERT do que ainda não existe.
 */
export function evaluateAchievements(f: AchievementFacts): AchievementCode[] {
  const unlocked: AchievementCode[] = [];

  // Primeiros passos — cada um destrava na 1ª ocorrência real da sua tabela-valor.
  if (f.workoutDays >= 1) unlocked.push("first_workout");
  if (f.hasWeightLog) unlocked.push("first_weight");
  if (f.hasPhoto) unlocked.push("first_photo");
  if (f.hasMealLog) unlocked.push("first_meal_day");
  if (f.hasActivitySession) unlocked.push("first_activity");
  if (f.hasSupplementIntake) unlocked.push("first_supplement");

  // Constância — streak do motor como proxy da jornada (D1).
  for (const m of STREAK_MILESTONES) {
    if (f.streak >= m.days) unlocked.push(m.code);
  }

  // Peso — "desde o início do acompanhamento" (D2). Limiar sobre kg eliminados.
  for (const m of WEIGHT_KG_MILESTONES) {
    if (f.kgLost >= m.kg) unlocked.push(m.code);
  }
  if (f.reachedTarget) unlocked.push("weight_target");

  return unlocked;
}

/**
 * Dias consecutivos (terminando HOJE ou ONTEM) com >=1 evento. ESPELHA a regra de streak do
 * adherenceEngine.deriveAdherenceConfig (mesmo algoritmo/valor), replicada aqui DE PROPÓSITO para
 * manter as conquistas desacopladas do arquivo do VRI (não editamos adherenceEngine.ts). Pura.
 */
export function deriveStreak(events: { created_at: string }[], now: Date): number {
  const dayKeys = new Set(events.map((e) => localDateKey(new Date(e.created_at))));
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dayKeys.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dayKeys.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Nº de DIAS locais distintos com workout_checked (guard #13). O WorkoutGuide emite 2
 * workout_checked por sessão (started+completed, ambos espelhados) — contar DIAS distintos
 * deduplica isso (mesma razão do countWorkoutDaysInWindow da constancy.ts, mas sem janela: aqui
 * é "algum treino já registrado?"). first_workout precisa de >= 1.
 */
export function countWorkoutDays(events: { type: string; created_at: string }[]): number {
  const days = new Set<string>();
  for (const e of events) {
    if (e.type === "workout_checked") days.add(localDateKey(new Date(e.created_at)));
  }
  return days.size;
}
