// Derivação PURA e DETERMINÍSTICA da JORNADA (S6). Substitui o getJourneyCheckpoints() MOCK
// (datas fictícias) do adherenceEngine SEM tocar naquele arquivo (regra inviolável: mudança no
// adherenceEngine é só aditiva e não pode mexer no VRI). Mesma entrada => mesma saída SEMPRE.
//
// Marcos da jornada = "Início do acompanhamento" (start_date) + as CONQUISTAS reais como marcos
// (destravadas = completadas, com a data real; travadas = marcos futuros, sem data). Nada é
// inventado: sem fonte real, um marco fica travado (estado vazio honesto), nunca mock.

// start_date é uma coluna DATE ("YYYY-MM-DD"): new Date(s) a interpretaria como UTC midnight e,
// num fuso negativo (BR = UTC-3), cairia no dia ANTERIOR -> "Dia X" +1 errado. Parseamos como data
// LOCAL para o "Dia X" bater com o calendário do paciente, independente do fuso. Determinístico.
function localMidnight(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface JourneyCheckpoint {
  id: string; // 'onboarding' | achievement code
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  date: string | null; // ISO (data real do marco) ou null se ainda não atingido
}

export interface JourneyView {
  dayNumber: number; // "Dia X" do acompanhamento (>=1); 0 se não há start_date
  startDate: string | null;
  checkpoints: JourneyCheckpoint[]; // completados em ordem cronológica, depois os travados
  completedCount: number;
  totalCount: number;
}

// Forma mínima de uma conquista para virar marco (vem de getAchievementsView).
export interface JourneyAchievementInput {
  code: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

/**
 * "Dia X" = dias locais desde start_date (start_date = dia 1). Marcos = onboarding + conquistas.
 * Completados (com data) primeiro, em ordem CRONOLÓGICA; travados por último (marcos futuros).
 */
export function deriveJourney(input: {
  startDate: string | null;
  now: Date;
  achievements: JourneyAchievementInput[];
}): JourneyView {
  const { startDate, now, achievements } = input;

  // "Dia X": diferença em dias LOCAIS + 1 (start_date = dia 1). Nunca < 1 quando há start_date.
  const dayNumber = dayNumberFor(startDate, now);

  const onboarding: JourneyCheckpoint = {
    id: "onboarding",
    title: "Início do acompanhamento",
    description: "Bem-vindo à sua jornada VERTEXA",
    icon: "🎉",
    completed: !!startDate,
    date: startDate,
  };

  const achievementCheckpoints: JourneyCheckpoint[] = achievements.map((a) => ({
    id: a.code,
    title: a.title,
    description: a.description,
    icon: a.icon,
    completed: a.unlocked,
    date: a.unlockedAt,
  }));

  const all = [onboarding, ...achievementCheckpoints];
  // Completados em ordem cronológica (ISO -> comparação lexicográfica é cronológica; sem data vai antes).
  const completed = all
    .filter((c) => c.completed)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  // Travados = marcos futuros, na ordem de entrada (ordem do catálogo de conquistas).
  const locked = all.filter((c) => !c.completed);

  const checkpoints = [...completed, ...locked];
  return {
    dayNumber,
    startDate,
    checkpoints,
    completedCount: completed.length,
    totalCount: checkpoints.length,
  };
}

// ── Marcos de 30, 60 e 90 dias (PDF do Ernâni, tela 06: "os marcos que o painel da clínica já usa") ──
export const DAY_MILESTONES = [30, 60, 90] as const;

export interface NextMilestone {
  day: number;          // 30 | 60 | 90
  current: number;      // dia atual da jornada
  remaining: number;    // dias que faltam
}

/** Próximo marco de 30/60/90 ainda por vir. Passado o dia 90, ou sem jornada iniciada (dia 0): null. */
export function nextDayMilestone(dayNumber: number): NextMilestone | null {
  if (!(dayNumber >= 1)) return null;
  const day = DAY_MILESTONES.find((m) => dayNumber < m);
  return day ? { day, current: dayNumber, remaining: day - dayNumber } : null;
}

/** "Início em 17 set" a partir de start_date (DATE). null sem data. */
export function startedOnLabel(startDate: string | null): string | null {
  if (!startDate) return null;
  const d = localMidnight(startDate);
  const mon = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `Início em ${d.getDate()} ${mon}`;
}

/** "Dia X" do acompanhamento (start_date = dia 1; nunca < 1 com start_date). 0 sem start_date. */
export function dayNumberFor(startDate: string | null, now: Date): number {
  if (!startDate) return 0;
  const startMid = localMidnight(startDate).getTime();
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.round((nowMid - startMid) / 86_400_000) + 1);
}

/**
 * Fase da Jornada pelo TEMPO de acompanhamento (decisão do Djeimyson, 21/10): 1–14, 15–30, 31–60, 61–90, 91+.
 * As chaves são as de sempre; os NOMES ainda são provisórios (o Ernâni define os definitivos).
 */
export type PhaseKey = "inicio" | "constancia_inicial" | "acompanhamento_ativo" | "revisao_progresso" | "manutencao";
export function phaseForDay(dayNumber: number): PhaseKey {
  if (dayNumber <= 14) return "inicio";
  if (dayNumber <= 30) return "constancia_inicial";
  if (dayNumber <= 60) return "acompanhamento_ativo";
  if (dayNumber <= 90) return "revisao_progresso";
  return "manutencao";
}
