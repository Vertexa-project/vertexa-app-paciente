// Adesão semanal de suplementos/medicamentos (PDF do Ernâni, tela 24). Funções PURAS.
// "Esperado" = 1 tomada por dia desde que o item existe (created_at), limitado aos últimos 7 dias.
// Não inventa dose por dia: o schema não tem frequência, então 1 marca/dia é o único critério honesto.
import { localDateKey } from "@/lib/pendingLogic";

export interface WeekSupplement { id: string; created_at: string }
export interface WeekIntake { supplement_id: string; taken_on: string }

/** Os 7 dias terminando em `today` (mais antigo primeiro), como chaves yyyy-mm-dd locais. */
export function lastSevenDays(today: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
    return localDateKey(d);
  });
}

export interface SupplementWeek {
  days: string[];
  /** por suplemento: para cada um dos 7 dias — true tomou · false não tomou · null ainda não existia */
  perSupplement: Record<string, (boolean | null)[]>;
  taken: number;
  expected: number;
}

export function supplementWeek(list: WeekSupplement[], intakes: WeekIntake[], today: Date): SupplementWeek {
  const days = lastSevenDays(today);
  const done = new Set(intakes.map((i) => `${i.supplement_id}|${i.taken_on}`));
  const perSupplement: Record<string, (boolean | null)[]> = {};
  let taken = 0;
  let expected = 0;
  for (const s of list) {
    const created = localDateKey(new Date(s.created_at));
    perSupplement[s.id] = days.map((day) => {
      if (day < created) return null;
      expected++;
      const ok = done.has(`${s.id}|${day}`);
      if (ok) taken++;
      return ok;
    });
  }
  return { days, perSupplement, taken, expected };
}
