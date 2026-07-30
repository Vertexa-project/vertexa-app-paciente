// VRI — VERTEXA Retention Index.
//
// ⚠️ ESTE MÓDULO NÃO CALCULA MAIS O VRI. (WP-METRIC-1b)
//
// O QUE SAIU DAQUI, e por quê:
//   computeScore · recencyPoints · getLevel · getStatus · getRiskFactors · getPositiveFactors ·
//   getAdherenceState · deriveAdherenceConfig · MockConfig · DEFAULT_CONFIG · as constantes de
//   calibração (VRI_BASE/HEADROOM/CURVE/SIGNAL_MAX, os três bônus) · getJourneyCheckpoints.
//
// O cálculo é SERVIDOR, e desde o WP-METRIC-1a ele é DADO e não código: a tabela
// `public.activity_event_types` diz, por tipo de evento, o que conta como ADESÃO
// (counts_as_adherence) e o que conta como INTERAÇÃO (counts_as_interaction). Quem calcula é
// `private.recompute_adherence_for`, chamada pela RPC `public.recompute_adherence()`; o
// resultado vira uma linha em `adherence_snapshots`, que é o que o app LÊ.
//
// MANTER uma segunda fórmula aqui seria garantir divergência: a mesma paciente veria um número
// no app e outro no painel do profissional, na mesma sessão — e o do app seria o desatualizado,
// porque a regra nova mora no banco. Pior: o antigo `getAdherenceState()` sem argumento caía no
// DEFAULT_CONFIG (um perfil de EXEMPLO: streak 18, 3 treinos) e devolvia 95%/"alta" para quem
// nunca registrou nada. O WP-APP-6 já tinha tirado esse caminho da Home e do Perfil; este WP
// tira a função que o tornava possível.
//
// O QUE FICOU, e por que não é cálculo de adesão:
//   · adherenceStateFromSnapshot — MAPEIA a linha do servidor para a forma que a UI consome.
//     Não decide score, level, status, streak nem os fatores: todos vêm do snapshot.
//   · getContextualMessage / getAutoActions — PRESENTAÇÃO sobre o estado já decidido pelo
//     servidor (escolhem a frase e as ações a partir de level/score/dias já persistidos).
//   · getJourneyPhase — rótulo de fase derivado do `streak` que veio do snapshot.
//   · os tipos.
//
// Se um dia o app precisar de um número que o servidor não dá, a resposta NÃO é recalcular
// aqui: é o servidor passar a dar.
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
 * Converte um snapshot persistido em AdherenceState para a UI. É MAPEAMENTO, não cálculo:
 * score/level/status/streak/weeklyCompletionRate e os dois arrays de fatores vêm PRONTOS do
 * servidor. Só três campos não persistidos são derivados, e nenhum deles é um número de adesão:
 * `journeyPhase` (rótulo a partir do streak do snapshot), `contextualMessage` (frase a partir do
 * level/score do snapshot) e `lastScoreChange` (diferença entre dois snapshots).
 * `prevScore` (snapshot anterior) alimenta o badge de variação (+N/−N) real.
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
