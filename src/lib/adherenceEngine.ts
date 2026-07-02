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
  // Fração 0..1 das refeições do plano marcadas HOJE (adesão alimentar). Opcional/aditivo:
  // ausente ou 0 => nenhum efeito (compatível com o config antigo e com o DEFAULT_CONFIG).
  mealAdherenceRatio?: number;
  // Nº de DIAS distintos com atividade complementar (activity_logged) nos últimos 7 dias.
  // Opcional/aditivo: ausente ou 0 => nenhum efeito (constância complementar; ver ACTIVITY_BONUS_*).
  complementaryActivityDaysThisWeek?: number;
}

// Bônus máximo (pontos) da ADESÃO ALIMENTAR do dia. É ESTRITAMENTE NÃO-NEGATIVO e entra ANTES
// do clamp [0,100] em computeScore => nunca REDUZ o score nem rebaixa o nível vs. o mesmo cálculo
// sem ele. Por isso preserva a demo da Mariana (pendência #3, seed atual = 88/alta): refeições=0
// -> +0 (score idêntico ao de hoje); refeições>0 -> score igual ou MAIOR. Calibrado baixo (6) para
// ser um reforço, não um driver — o nível dela não depende deste fator.
const MEAL_ADHERENCE_BONUS_MAX = 6;

// Bônus (pontos) por DIA distinto com atividade complementar na semana. Igual ao fator alimentar:
// ESTRITAMENTE NÃO-NEGATIVO e ANTES do clamp [0,100] => nunca REDUZ o score nem rebaixa o nível vs.
// o mesmo cálculo sem ele (preserva a Mariana 88/alta — pendência #3). Calibrado como REFORÇO, não
// driver: satura em ACTIVITY_BONUS_DAYS_CAP dias (3) -> máx +6, e cresce de forma gradual/crível
// (1 dia=+2, 2=+4, 3+=+6) — não fixa o VRI no teto num único registro. A tabela de pontuação NÃO é
// hardcode definitivo: será unificada numa fonte única (S7/Desafios).
const ACTIVITY_BONUS_PER_DAY = 2;
const ACTIVITY_BONUS_DAYS_CAP = 3;

const DEFAULT_CONFIG: MockConfig = {
  daysWithoutInteraction: 1,
  habitsLoggedToday: 3,
  workoutsThisWeek: 3,
  weightLoggedRecently: true,
  photoLoggedRecently: false,
  planViewedRecently: true,
  streak: 18,
};

// ── Composição do VRI (calibração C7) ────────────────────────────────────────────────────
// ANTES: o score começava em 100 (teto) e só SUBTRAÍA por inatividade, somando um STACK aditivo
// (habits+workouts+weight+photo+plan+streak+meal+activity ≤ +63) MUITO maior que o decay (≤ −45).
// Resultado: qualquer perfil minimamente ativo estourava 100 e o clamp mascarava tudo — o número não
// se movia (ação isolada = no-op) e a Mariana "vivia" cravando 100 em vez do 88/alta do seed. Duas
// causas: (a) base no teto + stack aditivo > decay; (b) a recência RESETAVA a 0 em qualquer evento
// novo, apagando a única penalidade ("reset-and-re-saturate").
// AGORA (combinado C7): a recência vira um termo POSITIVO LIMITADO (sem reset), e o TOTAL de sinais
// (recência + engajamento; os tiers por-sinal seguem INALTERADOS) entra numa banda [VRI_BASE,
// VRI_BASE+VRI_HEADROOM] via RETORNOS DECRESCENTES. Assim: engajado-mas-imperfeito lande ~88, o topo
// (100) fica RESERVADO ao near-perfect e uma ação isolada é um nudge pequeno e crível. NÃO baixa o
// clamp e NÃO subtrai cegamente; preserva monotonicidade (todo sinal bom só sobe) e o shape do
// snapshot. Calibrado p/ a Mariana real (hoje) ≈ 88-90/alta (pendência #3, não regredir).
const VRI_BASE = 70; // piso da banda "engajado" (o clamp inferior [0] segue como rede de segurança)
const VRI_HEADROOM = 30; // VRI_BASE + VRI_HEADROOM = 100 (teto reservado ao near-perfect)
const VRI_CURVE = 0.42; // < 1 => retornos decrescentes (comprime o topo; ação isolada = nudge pequeno)
const VRI_SIGNAL_MAX = 75; // máx possível: recência (12) + engajamento (63)

// Recência como termo POSITIVO limitado — não-crescente nos dias sem interação, SEM o cliff/reset que
// zerava a penalidade a cada evento novo (uma das causas do "100 no primeiro toque").
function recencyPoints(daysWithoutInteraction: number): number {
  if (daysWithoutInteraction <= 1) return 12;
  if (daysWithoutInteraction <= 3) return 8;
  if (daysWithoutInteraction <= 6) return 4;
  if (daysWithoutInteraction <= 14) return 1;
  return 0;
}

function computeScore(config: MockConfig): number {
  // Engajamento: MESMOS tiers por-sinal de antes (cada parcela ≥ 0 e monotônica), agora somados num
  // ORÇAMENTO limitado (≤ 63) em vez de empilhados sobre o teto de 100.
  let engagement = 0;
  engagement += Math.min(config.habitsLoggedToday * 3, 12);
  engagement += Math.min(config.workoutsThisWeek * 4, 16);
  if (config.weightLoggedRecently) engagement += 5;
  if (config.photoLoggedRecently) engagement += 5;
  if (config.planViewedRecently) engagement += 3;
  if (config.streak >= 30) engagement += 10;
  else if (config.streak >= 14) engagement += 7;
  else if (config.streak >= 7) engagement += 4;
  // Adesão alimentar do dia (ADITIVO, não-negativo).
  if (config.mealAdherenceRatio && config.mealAdherenceRatio > 0) {
    engagement += Math.round(Math.min(1, config.mealAdherenceRatio) * MEAL_ADHERENCE_BONUS_MAX);
  }
  // Atividade complementar da semana (ADITIVO, não-negativo).
  if (config.complementaryActivityDaysThisWeek && config.complementaryActivityDaysThisWeek > 0) {
    engagement += Math.min(config.complementaryActivityDaysThisWeek, ACTIVITY_BONUS_DAYS_CAP) * ACTIVITY_BONUS_PER_DAY;
  }

  // Sinal total (recência + engajamento) normalizado e comprimido por retornos decrescentes dentro
  // da banda [VRI_BASE, VRI_BASE+VRI_HEADROOM]. O clamp final é só rede de segurança.
  const signal = recencyPoints(config.daysWithoutInteraction) + engagement; // ∈ [0, VRI_SIGNAL_MAX]
  const normalized = Math.min(1, Math.max(0, signal / VRI_SIGNAL_MAX));
  const score = VRI_BASE + VRI_HEADROOM * Math.pow(normalized, VRI_CURVE);

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
  if ((config.mealAdherenceRatio ?? 0) >= 0.6) factors.push('Refeições do dia em dia');
  if ((config.complementaryActivityDaysThisWeek ?? 0) >= 2) factors.push('Atividades complementares na semana');
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
  // Adesão alimentar de HOJE (meal_logs vs plano ativo). Opcional/aditivo — ver MEAL_ADHERENCE_BONUS_MAX.
  mealAdherenceToday?: { done: number; total: number } | null;
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
  const { events, lastWeightAt, lastPhotoAt, now, mealAdherenceToday } = input;

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
  const activityDaysThisWeek = new Set<string>();
  for (const e of events) {
    if (daysAgoLocal(e.created_at, now) > 6) continue;
    if (e.type === "workout_checked") workoutDaysThisWeek.add(localDayKey(e.created_at));
    else if (e.type === "activity_logged") activityDaysThisWeek.add(localDayKey(e.created_at));
  }

  const weightLoggedRecently = !!lastWeightAt && daysAgoLocal(lastWeightAt, now) <= 7;
  const photoLoggedRecently = !!lastPhotoAt && daysAgoLocal(lastPhotoAt, now) <= 30;
  const planViewedRecently = daysWithoutInteraction <= 3;

  // Fração de refeições do plano feitas hoje (0..1). Sem plano ativo (total=0) -> 0 (sem efeito).
  const mealAdherenceRatio =
    mealAdherenceToday && mealAdherenceToday.total > 0
      ? mealAdherenceToday.done / mealAdherenceToday.total
      : 0;

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
    mealAdherenceRatio,
    complementaryActivityDaysThisWeek: activityDaysThisWeek.size,
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
