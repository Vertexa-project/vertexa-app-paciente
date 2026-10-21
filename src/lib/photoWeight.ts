// Peso de cada foto na comparação (PDF do Ernâni, tela 16: "Data e peso de cada foto"). PURO.
// Usa o registro de peso mais próximo da data da foto, só se estiver a até 7 dias; senão não mostra peso (não inventa).
export const MAX_GAP_DAYS = 7;
const DAY_MS = 86_400_000;

export function weightNear(takenAt: string, logs: { weight_kg: number | string; measured_at: string }[]): number | null {
  const t = new Date(takenAt).getTime();
  if (!Number.isFinite(t)) return null;
  let best: { kg: number; gap: number } | null = null;
  for (const l of logs) {
    const m = new Date(l.measured_at).getTime();
    const kg = Number(l.weight_kg);
    if (!Number.isFinite(m) || !Number.isFinite(kg)) continue;
    const gap = Math.abs(m - t);
    if (gap <= MAX_GAP_DAYS * DAY_MS && (best === null || gap < best.gap)) best = { kg, gap };
  }
  return best ? best.kg : null;
}

/** "17 set · 117,5 kg" ou só "17 set" sem peso próximo. */
export function photoCaption(dayLabel: string, kg: number | null): string {
  return kg === null ? dayLabel : `${dayLabel} · ${String(kg).replace(".", ",")} kg`;
}
