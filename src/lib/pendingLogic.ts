// Pure derivation of Home "pendências" from real data — no Supabase, fully unit-testable.
// Substitui o pending:true hardcoded da HomePage. Concluir a ação muda o dado real -> a
// pendência some / fica verde no próximo fetch.

/** Nº de dias inteiros desde `iso` até `now`, comparando por dia local (não por horas). */
export function daysAgoLocal(iso: string, now: Date): number {
  const d = new Date(iso);
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function sameLocalMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export interface PendingInput {
  lastWeightAt: string | null; // weight_logs.measured_at mais recente
  lastPhotoAt: string | null; // progress_photos.taken_at mais recente
  workoutTodayAt: string | null; // created_at de um workout_checked de hoje, ou null
  now: Date;
  weightStaleDays?: number; // default 7 (pesagem semanal)
}

export interface PendingState {
  weightPending: boolean;
  photoPending: boolean; // sem foto no MÊS corrente
  workoutPending: boolean; // sem workout_checked hoje
  weightDaysAgo: number | null;
  photoDaysAgo: number | null;
}

/**
 * Regras (CONTRATO/objetivo #6):
 * - foto: pendente se não houver foto no mês corrente.
 * - peso: pendente se o último weight_log tiver mais de N dias (default 7) — ou nunca houve.
 * - treino: pendente se não houver workout_checked hoje.
 */
export function derivePending(input: PendingInput): PendingState {
  const { lastWeightAt, lastPhotoAt, workoutTodayAt, now } = input;
  const weightStaleDays = input.weightStaleDays ?? 7;

  const weightDaysAgo = lastWeightAt ? daysAgoLocal(lastWeightAt, now) : null;
  const photoDaysAgo = lastPhotoAt ? daysAgoLocal(lastPhotoAt, now) : null;

  return {
    weightPending: weightDaysAgo === null || weightDaysAgo > weightStaleDays,
    photoPending: !lastPhotoAt || !sameLocalMonth(lastPhotoAt, now),
    workoutPending: !workoutTodayAt,
    weightDaysAgo,
    photoDaysAgo,
  };
}
