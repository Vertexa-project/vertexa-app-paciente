// Lembretes de exame e retorno (A2, redesign P6) — regras PURAS do app do paciente. ESPELHO de
// vertexa-web-pro/src/lib/domain/patientReminders.ts (os testes dos dois repositórios fixam os mesmos casos).
// O aviso é DERIVADO na leitura, no dia de Brasília (brtYmd), sem cron: mudou a data na clínica, muda aqui.
import { brtYmd } from "./restDay";

export type ReminderKind = "exam" | "return";

export interface ReminderRow {
  id: string;
  patient_id: string;
  kind: ReminderKind;
  title: string | null;
  /** AAAA-MM-DD (coluna date, sem fuso). */
  due_on: string;
  notify_patient: boolean;
  notify_days_before: number;
  message_template: string | null;
  done_at: string | null;
}

/** Dias que o card ainda aparece depois da data (depois some sozinho). */
export const PATIENT_GRACE_DAYS = 7;

export const DEFAULT_TEMPLATES: Record<ReminderKind, string> = {
  return: "Olá, {nome}! Seu retorno com a clínica é {quando}, em {data}. Se precisar remarcar, fale com a sua equipe pelo app.",
  exam: "Olá, {nome}! Lembrete: o exame {exame} deve ser feito até {data} ({quando}). Quando tiver o resultado, avise a sua equipe pelo app.",
};

const utcDay = (iso: string): number => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Dias de `todayIso` até `dueIso` (positivo = ainda falta). Só calendário. */
export function daysUntil(dueIso: string, todayIso: string): number {
  return Math.round(utcDay(dueIso) - utcDay(todayIso));
}

export function dateBR(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : "—";
}

export function whenText(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`;
}

/** Aparece no app? Só quando a clínica quer avisar, dentro da janela de aviso e até a tolerância depois da data. */
export function patientSees(r: ReminderRow, todayIso: string): boolean {
  if (!r.notify_patient || r.done_at) return false;
  const d = daysUntil(r.due_on, todayIso);
  if (d > r.notify_days_before) return false;
  return d >= 0 || -d <= PATIENT_GRACE_DAYS;
}

export function firstName(full: string | null | undefined): string {
  const w = (full ?? "").trim().split(/\s+/)[0];
  return w || "tudo bem";
}

/** Texto do aviso: modelo da clínica (ou o padrão) com {nome} {data} {quando} {exame} preenchidos. */
export function renderMessage(r: ReminderRow, name: string | null | undefined, todayIso: string): string {
  const tpl = r.message_template && r.message_template.trim() ? r.message_template : DEFAULT_TEMPLATES[r.kind];
  const map: Record<string, string> = {
    "{nome}": firstName(name),
    "{data}": dateBR(r.due_on),
    "{quando}": whenText(daysUntil(r.due_on, todayIso)),
    "{exame}": r.title?.trim() || "pedido",
  };
  return tpl.replace(/\{(nome|data|quando|exame)\}/g, (m) => map[m]).replace(/\s+/g, " ").trim();
}

export interface ReminderCardModel {
  id: string;
  kind: ReminderKind;
  headline: string;
  message: string;
  when: string;
  date: string;
  overdue: boolean;
  today: boolean;
}

/** Cards do Início: os que estão na janela, atrasados e mais próximos primeiro. */
export function reminderCards(rows: ReminderRow[], name: string | null | undefined, now: Date = new Date()): ReminderCardModel[] {
  const today = brtYmd(now);
  return rows
    .filter((r) => patientSees(r, today))
    .map((r) => ({ r, d: daysUntil(r.due_on, today) }))
    .sort((a, b) => a.d - b.d)
    .map(({ r, d }) => ({
      id: r.id,
      kind: r.kind,
      headline: r.kind === "return" ? "Seu retorno" : `Exame: ${r.title ?? "pedido"}`,
      message: renderMessage(r, name, today),
      when: whenText(d),
      date: dateBR(r.due_on),
      overdue: d < 0,
      today: d === 0,
    }));
}
