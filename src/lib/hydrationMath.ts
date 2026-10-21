// Pure hydration math — no Supabase, fully unit-testable.
// Contrato (CONTRATO_INTEGRACAO.md): "água de hoje" = soma de
// activity_events(type='hydration_logged') do dia, campo payload.liters (chave canônica).
// Toleramos o alias legado `amount` na LEITURA (a web também tolera), mas o app só ESCREVE `liters`.

/** Meta diária de hidratação (litros). Sem tabela própria — constante de produto. */
export const WATER_GOAL_LITERS = 2.5;

/** Incremento padrão do registro rápido (litros) — equivale a ~1 copo. */
export const WATER_INCREMENT_LITERS = 0.25;

export interface HydrationEventRow {
  payload: Record<string, unknown> | null;
}

function readLiters(payload: Record<string, unknown> | null): number | null {
  const raw = payload?.liters ?? payload?.amount;
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

/**
 * Soma os litros de uma lista de eventos de hidratação (já filtrados para o dia pela camada
 * de api). Arredonda para 2 casas para evitar drift de ponto flutuante com incrementos de 0,25.
 */
export function sumHydrationLiters(rows: HydrationEventRow[]): number {
  let total = 0;
  for (const row of rows) {
    const value = readLiters(row.payload);
    if (value !== null) total += value;
  }
  return Math.round(total * 100) / 100;
}

/** Atalhos de registro (mL) — PDF do Ernâni, tela 04. O app grava sempre em litros (payload.liters). */
export const WATER_QUICK_ML = [150, 250, 500] as const;

export function mlToLiters(ml: number): number {
  return Math.round(ml) / 1000;
}

/** Quanto do copo está cheio (0–100) em relação à meta do dia. */
export function glassFillPercent(liters: number, goal: number = WATER_GOAL_LITERS): number {
  if (!(goal > 0) || !(liters > 0)) return 0;
  return Math.min(100, Math.round((liters / goal) * 100));
}
