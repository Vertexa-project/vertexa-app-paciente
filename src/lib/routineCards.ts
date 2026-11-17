// Cartões de Rotina (A4) e Missão da 1ª semana (A5) no Início — regras PURAS. O banco decide o que está aberto/feito
// (em Brasília, sobre os registros reais); aqui só viram texto e destino de tela.

export type RoutineItemKey = "photo" | "weight" | "feedback";
export type MissionStepKey = "photo_front" | "photo_side" | "photo_back" | "weight" | "supplements_photo" | "bio";

export interface RoutineCurrent { key: RoutineItemKey; label: string; due_on: string; state: "due_today" | "overdue" }
export interface RoutineView { enabled: boolean; source: string; current: RoutineCurrent[] }
export interface MissionStepView { key: MissionStepKey; label: string; allow_skip: boolean; done: boolean; done_on: string | null }
export interface MissionView {
  enabled: boolean; started: boolean; days?: number; ends_on?: string; overdue?: boolean; steps?: MissionStepView[];
  done_count?: number; total?: number; completed?: boolean; completed_on?: string | null; celebrated?: boolean;
}

const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** AAAA-MM-DD → dia da semana por extenso curto, sem passar por fuso (a data já é de Brasília). */
export function weekdayOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "hoje";
  return WEEKDAY[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)).getUTCDay()];
}

export function dayMonth(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}` : "";
}

const PHRASE: Record<RoutineItemKey, string> = {
  photo: "foto de evolução",
  weight: "foto da balança em jejum",
  feedback: "como foi a semana",
};

/** "Rotina de sexta" — o dia vem da ocorrência mais antiga ainda aberta. */
export function routineTitle(current: RoutineCurrent[]): string {
  if (current.length === 0) return "Rotina";
  const first = [...current].sort((a, b) => a.due_on.localeCompare(b.due_on))[0];
  return `Rotina de ${weekdayOf(first.due_on)}`;
}

/** "foto da balança em jejum, como foi a semana". */
export function routineSummary(current: RoutineCurrent[]): string {
  return current.map((c) => PHRASE[c.key]).join(", ");
}

export const ROUTINE_ACTION: Record<"photo" | "weight", { to: string; label: string }> = {
  photo: { to: "/records?tab=photo", label: "Enviar foto" },
  weight: { to: "/records?tab=weight", label: "Registrar peso" },
};

/** Passos com tela própria de registro (usam Records); suplementos e bio são feitos no próprio cartão. */
export function stepRoute(key: MissionStepKey): string | null {
  switch (key) {
    case "photo_front": return "/records?tab=photo&pose=front";
    case "photo_side": return "/records?tab=photo&pose=side";
    case "photo_back": return "/records?tab=photo&pose=back";
    case "weight": return "/records?tab=weight";
    default: return null;
  }
}

/** A missão concluída continua como cartão compacto por alguns dias; depois some. */
export const COMPLETED_VISIBLE_DAYS = 7;

export function missionVisible(m: MissionView | null | undefined, todayKey: string): boolean {
  if (!m || !m.enabled || !m.started) return false;
  if (!m.completed) return true;
  if (!m.celebrated) return true;
  if (!m.completed_on) return false;
  const [y, mo, d] = m.completed_on.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, mo - 1, d)) / 86_400_000);
  return days <= COMPLETED_VISIBLE_DAYS;
}

/** Só abre o "parabéns" uma vez: concluída e ainda não mostrada. */
export function shouldCelebrateMission(m: MissionView | null | undefined): boolean {
  return Boolean(m && m.enabled && m.started && m.completed && !m.celebrated);
}

export function missionProgressText(m: Pick<MissionView, "done_count" | "total">): string {
  return `${m.done_count ?? 0} de ${m.total ?? 0}`;
}
