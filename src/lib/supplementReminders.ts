// Lembretes de suplementos/medicamentos DENTRO do app (sem push do aparelho): itens cujo horário já passou hoje
// e que ainda não foram marcados como tomados. PURO e testável.
export interface ReminderItem {
  id: string;
  name: string;
  dose: string | null;
  kind: "supplement" | "medication";
  reminder_time: string | null;
}

/** "08:30:00" | "08:30" → minutos desde 00:00; inválido/vazio → null. */
export function reminderMinutes(t: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec((t ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 23 || min > 59 ? null : h * 60 + min;
}

export function dueReminders<T extends ReminderItem>(list: readonly T[], takenIds: ReadonlySet<string>, now: Date): T[] {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return list
    .map((s) => ({ s, at: reminderMinutes(s.reminder_time) }))
    .filter((x): x is { s: T; at: number } => x.at != null && x.at <= nowMin && !takenIds.has(x.s.id))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.s);
}

/** "08:30:00" → "08:30" (vazio se inválido). */
export function reminderLabel(t: string | null | undefined): string {
  const m = reminderMinutes(t);
  if (m == null) return "";
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
