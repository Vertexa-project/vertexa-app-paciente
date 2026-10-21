import { beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ calls: [] as string[], inserted: null as Record<string, unknown> | null }));
vi.mock("./patient", () => ({ getMyPatientId: vi.fn(async () => "pat1") }));
vi.mock("./plan", () => ({ getMyNutritionPlan: vi.fn() }));
vi.mock("@/lib/supabase", () => {
  const del: Record<string, unknown> = {};
  del.eq = () => del; del.then = (r: (v: unknown) => void) => { h.calls.push("delete"); r({ error: null }); };
  return { supabase: { from: () => ({
    delete: () => del,
    insert: (row: Record<string, unknown>) => { h.calls.push("insert"); h.inserted = row; return Promise.resolve({ error: null }); },
  }) } };
});
import { registerMealOption } from "./meals";
beforeEach(() => { h.calls = []; h.inserted = null; });

describe("registerMealOption", () => {
  it("apaga a marca de hoje e insere de novo, com a opção escolhida", async () => {
    await registerMealOption({ mealId: "m1", optionIndex: 3 });
    expect(h.calls).toEqual(["delete", "insert"]);
    expect(h.inserted).toMatchObject({ patient_id: "pat1", meal_id: "m1", option_index: 3, source: "app" });
  });
  it("opção 1 (a original) grava NULL", async () => {
    await registerMealOption({ mealId: "m1", optionIndex: 1 });
    expect(h.inserted).toMatchObject({ option_index: null });
  });
});
