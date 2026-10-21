// Conferência do peso antes de salvar (PDF do Ernâni, tela 03: "O app confere antes de salvar").
// Motivo real: 117 → 108 kg em dois dias entrou sem checagem e distorceu o gráfico.
// Regra: variação acima de 2 kg POR DIA em relação ao último registro pede confirmação.
// Funções puras; o servidor não é consultado.

export const MAX_KG_PER_DAY = 2;
const DAY_MS = 86_400_000;

export interface LastWeight { weight_kg: number | string; measured_at: string }

export type WeightCheck =
  | { status: "ok" }
  | { status: "confirm"; previousKg: number; deltaKg: number; days: number; perDay: number };

/** Dias inteiros desde o último registro, no mínimo 1 (dois registros no mesmo dia contam como 1 dia). */
export function daysBetween(fromIso: string, now: Date): number {
  const diff = now.getTime() - new Date(fromIso).getTime();
  return Math.max(1, Math.round(diff / DAY_MS));
}

export function checkWeight(newKg: number, last: LastWeight | null | undefined, now: Date): WeightCheck {
  if (!last) return { status: "ok" };
  const previousKg = Number(last.weight_kg);
  if (!Number.isFinite(previousKg)) return { status: "ok" };
  const deltaKg = Math.round((newKg - previousKg) * 10) / 10;
  const days = daysBetween(last.measured_at, now);
  const perDay = Math.abs(deltaKg) / days;
  if (perDay > MAX_KG_PER_DAY) return { status: "confirm", previousKg, deltaKg, days, perDay };
  return { status: "ok" };
}

const kg1 = (n: number) => n.toFixed(1).replace(".", ",");

export function confirmMessage(newKg: number, c: Extract<WeightCheck, { status: "confirm" }>): string {
  const when = c.days === 1 ? "há 1 dia" : `há ${c.days} dias`;
  return `Seu último peso foi ${kg1(c.previousKg)} kg, ${when}. Agora você digitou ${kg1(newKg)} kg — uma diferença de ${kg1(Math.abs(c.deltaKg))} kg. Está certo?`;
}
