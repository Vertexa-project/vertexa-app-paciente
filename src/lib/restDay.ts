// Dia de descanso (WP-REST-A). Regras PURAS. O servidor decide (RLS + trigger); aqui só dia e mensagens.
export const REST_DAY_LIMIT_PER_WEEK = 2;

/** Dia (aaaa-mm-dd) em America/Sao_Paulo — o mesmo calendário que o servidor usa para a sequência. */
export function brtYmd(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // en-CA => aaaa-mm-dd
}

/** Dia anterior de um aaaa-mm-dd (aritmética em UTC, sem fuso). */
export function previousYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

export function restDayErrorMessage(err: unknown): string {
  const e = err as { code?: string; hint?: string } | null;
  if (e?.hint === "REST_DAY_LIMIT") return `Você já usou ${REST_DAY_LIMIT_PER_WEEK} dias de descanso nesta semana.`;
  if (e?.code === "23505") return "Esse dia já está marcado como descanso.";
  return "Não foi possível marcar o descanso. Tente de novo.";
}
