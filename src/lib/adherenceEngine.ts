// VRI - VERTEXA Retention Index
// Adherence score and risk engine. A FÓRMULA (computeScore) é fixa (combinado C6); o que muda
// na Sessão 2 é a ORIGEM dos inputs: deriveAdherenceConfig monta o config a partir de dados
// REAIS de activity_events/weight_logs/progress_photos (ver src/lib/api/adherence.ts).
import { daysAgoLocal } from "@/lib/pendingLogic";

export type AdherenceLevel = 'alta' | 'moderada' | 'baixa' | 'risco';
export type PatientStatus = 'novo' | 'em_acompanhamento' | 'atencao' | 'em_risco' | 'inativo';
export type JourneyPhase = 'inicio' | 'constancia_inicial' | 'acompanhamento_ativo' | 'revisao_progresso' | 'manutencao';

export interface AdherenceState {
  score: number; // 0-100
  level: AdherenceLevel;
  status: PatientStatus;
  journeyPhase: JourneyPhase;
  daysSinceLastInteraction: number;
  streak: number;
  weeklyCompletionRate: number;
  riskFactors: string[];
  positiveFactors: string[];
  contextualMessage: string;
  lastScoreChange: number; // positive or negative delta
}

export interface MockConfig {
  daysWithoutInteraction: number;
  habitsLoggedToday: number;
  workoutsThisWeek: number;
  weightLoggedRecently: boolean;
  photoLoggedRecently: boolean;
  planViewedRecently: boolean;
  streak: number;
}

const DEFAULT_CONFIG: MockConfig = {
  daysWithoutInteraction: 1,
  habitsLoggedToday: 3,
  workoutsThisWeek: 3,
  weightLoggedRecently: true,
  photoLoggedRecently: false,
  planViewedRecently: true,
  streak: 18,
};

function computeScore(config: MockConfig): number {
  let score = 100;

  // Interaction decay
  if (config.daysWithoutInteraction >= 15) score -= 45;
  else if (config.daysWithoutInteraction >= 7) score -= 30;
  else if (config.daysWithoutInteraction >= 3) score -= 15;
  else if (config.daysWithoutInteraction >= 1) score -= 5;

  // Habits bonus
  score += Math.min(config.habitsLoggedToday * 3, 12);

  // Workouts
  score += Math.min(config.workoutsThisWeek * 4, 16);

  // Weight logging
  if (config.weightLoggedRecently) score += 5;

  // Photo
  if (config.photoLoggedRecently) score += 5;

  // Plan viewed
  if (config.planViewedRecently) score += 3;

  // Streak bonus
  if (config.streak >= 30) score += 10;
  else if (config.streak >= 14) score += 7;
  else if (config.streak >= 7) score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getLevel(score: number): AdherenceLevel {
  if (score >= 80) return 'alta';
  if (score >= 50) return 'moderada';
  if (score >= 20) return 'baixa';
  return 'risco';
}

function getStatus(score: number, days: number): PatientStatus {
  if (days >= 15) return 'inativo';
  if (score < 20) return 'em_risco';
  if (score < 50) return 'atencao';
  if (days <= 1) return 'em_acompanhamento';
  return 'em_acompanhamento';
}

export function getJourneyPhase(streak: number, workoutsWeek: number): JourneyPhase {
  if (streak < 7) return 'inicio';
  if (streak < 14) return 'constancia_inicial';
  if (streak < 30) return 'acompanhamento_ativo';
  if (streak < 60) return 'revisao_progresso';
  return 'manutencao';
}

export function getContextualMessage(state: Omit<AdherenceState, 'contextualMessage'>): string {
  if (state.level === 'risco') return 'Sua constância caiu. Que tal retomar hoje?';
  if (state.level === 'baixa') return 'Você está há alguns dias sem registrar hábitos. Vamos voltar?';
  if (state.daysSinceLastInteraction >= 3) return 'Sentimos sua falta! Hoje é um bom dia para retomar.';
  if (state.score >= 90) return 'Você está arrasando! Continue assim. 🔥';
  if (state.score >= 80) return 'Excelente adesão! Sua constância está fazendo a diferença.';
  if (state.score >= 65) return 'Você está indo bem nesta semana. Falta pouco para fechar sua meta!';
  return 'Vamos manter sua constância hoje. Cada passo conta!';
}

function getRiskFactors(config: MockConfig): string[] {
  const factors: string[] = [];
  if (config.daysWithoutInteraction >= 3) factors.push(`${config.daysWithoutInteraction} dias sem interação`);
  if (config.habitsLoggedToday === 0) factors.push('Nenhum hábito registrado hoje');
  if (config.workoutsThisWeek < 2) factors.push('Poucos treinos esta semana');
  if (!config.weightLoggedRecently) factors.push('Peso não registrado recentemente');
  if (!config.photoLoggedRecently) factors.push('Foto mensal pendente');
  return factors;
}

function getPositiveFactors(config: MockConfig): string[] {
  const factors: string[] = [];
  if (config.streak >= 7) factors.push(`Sequência de ${config.streak} dias`);
  if (config.habitsLoggedToday >= 3) factors.push('Hábitos em dia');
  if (config.workoutsThisWeek >= 3) factors.push('Treinos consistentes');
  if (config.weightLoggedRecently) factors.push('Peso atualizado');
  if (config.planViewedRecently) factors.push('Plano acompanhado');
  return factors;
}

export function getAdherenceState(config: Partial<MockConfig> = {}): AdherenceState {
  const c = { ...DEFAULT_CONFIG, ...config };
  const score = computeScore(c);
  const level = getLevel(score);
  const status = getStatus(score, c.daysWithoutInteraction);
  const journeyPhase = getJourneyPhase(c.streak, c.workoutsThisWeek);

  const partial: Omit<AdherenceState, 'contextualMessage'> = {
    score,
    level,
    status,
    journeyPhase,
    daysSinceLastInteraction: c.daysWithoutInteraction,
    streak: c.streak,
    weeklyCompletionRate: Math.round((c.workoutsThisWeek / 5) * 100),
    riskFactors: getRiskFactors(c),
    positiveFactors: getPositiveFactors(c),
    lastScoreChange: 3,
  };

  return {
    ...partial,
    contextualMessage: getContextualMessage(partial),
  };
}

// ── Inputs REAIS (Sessão 2, objetivo #7) ────────────────────────────────────────────────
// Tipos de evento que contam como "hábito do dia" (activity_events).
const HABIT_EVENT_TYPES = new Set(["hydration_logged", "sleep_logged", "mood_logged"]);

export interface AdherenceActivityInput {
  // activity_events do paciente (qualquer tipo); só created_at/type são usados.
  events: { type: string; created_at: string }[];
  lastWeightAt: string | null; // weight_logs.measured_at mais recente
  lastPhotoAt: string | null; // progress_photos.taken_at mais recente
  now: Date;
}

function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Monta o MockConfig a partir de dados REAIS (mantém a fórmula intacta — só troca a origem):
 * - daysWithoutInteraction: dias desde o evento mais recente.
 * - habitsLoggedToday: nº de eventos de hábito (água/sono/humor) de hoje.
 * - workoutsThisWeek: nº de DIAS distintos com workout_checked nos últimos 7 dias.
 * - weight/photoLoggedRecently: último peso ≤7d / última foto ≤30d.
 * - planViewedRecently: proxy por interação recente (plan_viewed não é persistido).
 * - streak: dias consecutivos (terminando hoje ou ontem) com ≥1 evento.
 */
export function deriveAdherenceConfig(input: AdherenceActivityInput): MockConfig {
  const { events, lastWeightAt, lastPhotoAt, now } = input;

  const mostRecent = events.reduce<string | null>((acc, e) => {
    if (!acc) return e.created_at;
    return new Date(e.created_at).getTime() > new Date(acc).getTime() ? e.created_at : acc;
  }, null);
  const daysWithoutInteraction = mostRecent ? daysAgoLocal(mostRecent, now) : 30;

  const todayKey = localDayKey(now.toISOString());
  const habitsLoggedToday = events.filter(
    (e) => HABIT_EVENT_TYPES.has(e.type) && localDayKey(e.created_at) === todayKey
  ).length;

  const workoutDaysThisWeek = new Set<string>();
  for (const e of events) {
    if (e.type !== "workout_checked") continue;
    if (daysAgoLocal(e.created_at, now) <= 6) workoutDaysThisWeek.add(localDayKey(e.created_at));
  }

  const weightLoggedRecently = !!lastWeightAt && daysAgoLocal(lastWeightAt, now) <= 7;
  const photoLoggedRecently = !!lastPhotoAt && daysAgoLocal(lastPhotoAt, now) <= 30;
  const planViewedRecently = daysWithoutInteraction <= 3;

  // streak: começa em hoje se houver evento hoje, senão ontem; conta dias consecutivos para trás.
  const dayKeys = new Set(events.map((e) => localDayKey(e.created_at)));
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dayKeys.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dayKeys.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    daysWithoutInteraction,
    habitsLoggedToday,
    workoutsThisWeek: workoutDaysThisWeek.size,
    weightLoggedRecently,
    photoLoggedRecently,
    planViewedRecently,
    streak,
  };
}

// Forma mínima de um snapshot persistido (adherence_snapshots) que a Home LÊ para exibir o
// MESMO VRI que a web (fonte única → consistência app↔web garantida por construção).
export interface PersistedAdherenceSnapshot {
  score: number;
  level: AdherenceLevel;
  status: PatientStatus;
  streak: number;
  weeklyCompletionRate: number;
  riskFactors: string[];
  positiveFactors: string[];
}

/**
 * Converte um snapshot persistido em AdherenceState para a UI da Home. Campos não persistidos
 * (contextualMessage, journeyPhase, lastScoreChange) são derivados de forma determinística.
 * `prevScore` (snapshot anterior) alimenta o badge de variação (+N/-N) real.
 */
export function adherenceStateFromSnapshot(
  latest: PersistedAdherenceSnapshot,
  prevScore?: number
): AdherenceState {
  const partial: Omit<AdherenceState, 'contextualMessage'> = {
    score: latest.score,
    level: latest.level,
    status: latest.status,
    journeyPhase: getJourneyPhase(latest.streak, 0),
    daysSinceLastInteraction: 0,
    streak: latest.streak,
    weeklyCompletionRate: latest.weeklyCompletionRate,
    riskFactors: latest.riskFactors ?? [],
    positiveFactors: latest.positiveFactors ?? [],
    lastScoreChange: prevScore === undefined ? 0 : latest.score - prevScore,
  };
  return { ...partial, contextualMessage: getContextualMessage(partial) };
}

// Journey checkpoints
export interface JourneyCheckpoint {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  date?: string;
  icon: string;
}

export function getJourneyCheckpoints(): JourneyCheckpoint[] {
  return [
    { id: 'onboarding', title: 'Onboarding concluído', description: 'Bem-vindo à VERTEXA', completed: true, date: '15 Jan', icon: '🎉' },
    { id: 'first_week', title: 'Primeira semana com registros', description: '7 dias consecutivos de registros', completed: true, date: '22 Jan', icon: '📋' },
    { id: 'first_goal', title: 'Primeira meta batida', description: 'Meta de hidratação diária', completed: true, date: '25 Jan', icon: '🎯' },
    { id: 'first_photo', title: 'Primeira foto enviada', description: 'Foto de acompanhamento', completed: true, date: '01 Fev', icon: '📸' },
    { id: 'consistency_14', title: '14 dias de constância', description: 'Duas semanas seguidas de adesão', completed: true, date: '29 Jan', icon: '🔥' },
    { id: '3kg_lost', title: '3kg eliminados', description: 'Primeiro marco de peso', completed: true, date: '28 Fev', icon: '⚖️' },
    { id: '5kg_lost', title: '5kg eliminados', description: 'Marco significativo!', completed: true, date: '10 Abr', icon: '💪' },
    { id: 'monthly_review', title: 'Revisão mensal de progresso', description: 'Análise completa da evolução', completed: false, icon: '📊' },
    { id: 'consistency_30', title: '30 dias de constância', description: 'Um mês completo de adesão', completed: false, icon: '🏆' },
    { id: 'target_weight', title: 'Peso-alvo atingido', description: 'Meta final de peso', completed: false, icon: '🌟' },
  ];
}

// Simulated automatic actions
export interface AutoAction {
  id: string;
  type: 'reminder' | 'reinforcement' | 'alert' | 'incentive';
  title: string;
  message: string;
  icon: string;
  priority: 'low' | 'medium' | 'high';
  triggerCondition: string;
}

export function getAutoActions(state: AdherenceState): AutoAction[] {
  const actions: AutoAction[] = [];

  if (state.daysSinceLastInteraction >= 3) {
    actions.push({
      id: 'retake',
      type: 'alert',
      title: 'Retome sua rotina',
      message: `Você está há ${state.daysSinceLastInteraction} dias sem registrar hábitos. Sua equipe percebeu e quer te ajudar.`,
      icon: '⚠️',
      priority: 'high',
      triggerCondition: 'no_interaction_3d',
    });
  }

  if (state.score >= 80) {
    actions.push({
      id: 'positive',
      type: 'reinforcement',
      title: 'Você está incrível!',
      message: 'Sua adesão está excelente. Continue assim e sua evolução será ainda mais visível.',
      icon: '🔥',
      priority: 'low',
      triggerCondition: 'high_adherence',
    });
  }

  if (state.level === 'moderada') {
    actions.push({
      id: 'incentive',
      type: 'incentive',
      title: 'Falta pouco!',
      message: 'Complete mais 2 hábitos hoje para subir seu índice de adesão.',
      icon: '💪',
      priority: 'medium',
      triggerCondition: 'moderate_adherence',
    });
  }

  actions.push({
    id: 'photo_reminder',
    type: 'reminder',
    title: 'Foto mensal pendente',
    message: 'Envie sua foto de acompanhamento para comparar sua evolução.',
    icon: '📸',
    priority: 'medium',
    triggerCondition: 'monthly_photo_due',
  });

  return actions;
}
