// Aplicação de medicação (A3) — regras puras do app do paciente. O estado (hoje/atrasada) é calculado no banco
// em America/Sao_Paulo (RPC med_patient_today); aqui só se apresenta o texto.
export interface MedToday {
  enabled: boolean;
  state?: "today" | "overdue" | "ok" | "upcoming" | "none" | "ended";
  due_on?: string | null;
  days_late?: number;
  treatment_id?: string;
  medication?: string;
  dose_mg?: number;
  weekday?: number;
}

/** 2,5 mg · 10 mg. */
export function formatMg(mg: number): string {
  return `${Number(mg).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} mg`;
}

export interface MedCard { overdue: boolean; headline: string; detail: string | null; button: string }

/** Só há cartão quando a clínica ligou o lembrete E hoje é o dia ou a aplicação passou do dia sem registro. */
export function medCard(m: MedToday | null | undefined): MedCard | null {
  if (!m || !m.enabled || !m.medication || m.dose_mg == null) return null;
  const what = `${m.medication} ${formatMg(m.dose_mg)}`;
  if (m.state === "today") return { overdue: false, headline: `Hoje é dia da sua aplicação: ${what}`, detail: null, button: "Já apliquei" };
  if (m.state === "overdue") {
    const n = m.days_late ?? 1;
    return { overdue: true, headline: "Aplicação atrasada", detail: `${what} · era ${n === 1 ? "ontem" : `há ${n} dias`}. Se já aplicou, toque em “Já apliquei”.`, button: "Já apliquei" };
  }
  return null;
}

export function medConfirmError(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? "";
  if (msg.includes("NOTHING_DUE")) return "Sua aplicação de hoje já está registrada.";
  return "Não foi possível registrar agora. Tente de novo.";
}
