// Pure muscle-recovery rule — no Supabase, fully unit-testable (sibling of pendingLogic.ts).
//
// CONTRATO #1 / types.ts MuscleStatus: o status EXIBIDO é DERIVADO de last_trained_at.
// O writer (recovery.ts) grava sempre 'fatigued' e NÃO há job de recálculo — então a coluna
// `status` do banco NÃO é a fonte de verdade do que o body map pinta. Esta regra deriva o
// estado a partir dos dias (em fuso LOCAL) desde o último estímulo:
//
//   0-2 dias = fatigued (vermelho) · 3 = recovering (amarelo) · 4 = recovered (azul)
//   5+ dias  = weakened (verde)     · sem histórico (null) = neutral (cinza)
import { daysAgoLocal } from "@/lib/pendingLogic";
import type { MuscleStatus } from "@/lib/api/types";

/**
 * Mapeia o nº de dias desde o último estímulo para o status canônico de recuperação.
 * `null` (nunca treinado) -> neutral. Dias negativos (relógio adiantado) contam como 0.
 */
export function recoveryStatusForDays(daysSinceTrained: number | null): MuscleStatus {
  if (daysSinceTrained === null) return "neutral";
  const d = Math.max(0, daysSinceTrained);
  if (d <= 2) return "fatigued";
  if (d === 3) return "recovering";
  if (d === 4) return "recovered";
  return "weakened";
}

/**
 * Deriva o status a partir de `last_trained_at` (ISO) comparado a `now`, contando dias em
 * fuso LOCAL via daysAgoLocal (evita erro de ±1 dia perto da meia-noite / UTC). `null` -> neutral.
 */
export function recoveryStatusForLastTrained(
  lastTrainedAt: string | null,
  now: Date
): MuscleStatus {
  if (!lastTrainedAt) return "neutral";
  return recoveryStatusForDays(daysAgoLocal(lastTrainedAt, now));
}
