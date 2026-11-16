// Fala do tigrezinho (mascote das metas do dia). Texto 100% determinístico, só sobre metas do dia e sequência.
// NUNCA fala de resultado clínico (peso, gordura, exames): a função só recebe metas e sequência, e o teste varre as saídas.

export type MascotGoalId = "water" | "meals" | "workout" | "meds";

export interface MascotGoal {
  id: MascotGoalId;
  current: number;
  target: number;
}

export interface MascotSpeech {
  /** Ex.: "3 dias seguidos". null quando não há sequência. */
  headline: string | null;
  line: string;
  allDone: boolean;
  doneCount: number;
  total: number;
}

const PENDING_LABEL: Record<MascotGoalId, string> = {
  water: "a água",
  meals: "as refeições",
  workout: "o treino",
  meds: "os remédios",
};

// Ordem em que a falta é citada.
const ORDER: MascotGoalId[] = ["water", "meals", "workout", "meds"];

function isValid(g: MascotGoal): boolean {
  return Number.isFinite(g.current) && Number.isFinite(g.target) && g.target > 0;
}

function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function streakHeadline(streak: number | null | undefined): string | null {
  const n = Math.floor(Number(streak));
  if (!Number.isFinite(n) || n < 1) return null;
  return n === 1 ? "1 dia seguido" : `${n} dias seguidos`;
}

/** Meta sem dado (target inválido) não entra: não conta, não aparece na fala. */
export function mascotSpeech(input: { streak: number | null | undefined; goals: MascotGoal[] }): MascotSpeech {
  const goals = input.goals.filter(isValid);
  const headline = streakHeadline(input.streak);
  const done = goals.filter((g) => g.current >= g.target);
  const pending = ORDER.map((id) => goals.find((g) => g.id === id && g.current < g.target)).filter(
    (g): g is MascotGoal => Boolean(g),
  );

  if (goals.length === 0) {
    return { headline, line: "Estou por aqui para acompanhar as suas metas do dia.", allDone: false, doneCount: 0, total: 0 };
  }
  if (pending.length === 0) {
    return { headline, line: "Dia fechado!", allDone: true, doneCount: done.length, total: goals.length };
  }
  const names = pending.map((g) => PENDING_LABEL[g.id]);
  const line =
    names.length === 1 ? `Falta ${names[0]} para fechar o dia.` : `Faltam ${joinPt(names)} para fechar o dia.`;
  return { headline, line, allDone: false, doneCount: done.length, total: goals.length };
}

/** Comemora (animação) só quando o número de metas fechadas SOBE com a tela já carregada. */
export function shouldCelebrate(prevDone: number | null, nextDone: number): boolean {
  return prevDone !== null && nextDone > prevDone;
}
