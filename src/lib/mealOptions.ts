// Opções de refeição (PDF do Ernâni, tela 19). A "Opção 1" é a própria refeição; as alternativas vêm em meal.options.
// O web grava (meals.options); o app só lê.
export interface MealOption { items: string[]; calories: number | null }

/** Lê o jsonb do banco com segurança (valor inesperado vira lista vazia). */
export function parseOptions(raw: unknown): MealOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o) => {
    const items = Array.isArray(o?.items) ? o.items.filter((x: unknown): x is string => typeof x === "string" && x.trim() !== "") : [];
    if (items.length === 0) return [];
    const c = o?.calories;
    return [{ items, calories: typeof c === "number" && Number.isFinite(c) ? c : null }];
  });
}

/** Opção N (1 = a própria refeição) como lista única, na ordem mostrada ao paciente. */
export function allOptions(meal: { items: string[]; calories: number | null }, alternatives: MealOption[]): (MealOption & { index: number })[] {
  return [{ items: meal.items, calories: meal.calories, index: 1 }, ...alternatives.map((o, k) => ({ ...o, index: k + 2 }))];
}
