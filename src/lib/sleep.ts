// Regras PURAS do registro de sono (espelham as constraints de sleep_logs no banco).
export const SLEEP_MIN_HOURS = 0.5;
export const SLEEP_MAX_HOURS = 24;
export const SLEEP_GOAL_HOURS = 8;
export const SLEEP_QUALITY_LABEL: Record<number, string> = { 1: "Muito ruim", 2: "Ruim", 3: "Regular", 4: "Boa", 5: "Ótima" };

/** "7,5" / "7.5" → 7.5 ; fora de 0,5–24 ou não numérico → null. Arredonda a 2 casas (numeric(4,2)). */
export function parseSleepHours(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!/^\d{1,2}([.]\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < SLEEP_MIN_HOURS || n > SLEEP_MAX_HOURS) return null;
  return Math.round(n * 100) / 100;
}

/** Data local (dia em que a pessoa acordou) em aaaa-mm-dd. */
export function localYmd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 7.5 → "7h30" ; 8 → "8h". */
export function formatSleepHours(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, "0")}`;
}
