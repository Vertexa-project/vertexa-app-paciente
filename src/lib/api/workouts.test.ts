import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ workouts: [] as unknown[] }));
vi.mock("./patient", () => ({ getMyPatientId: vi.fn(async () => "pat-1") }));
vi.mock("./exerciseLibrary", () => ({ getExerciseLibraryMediaIndex: vi.fn(async () => new Map()), normalizeExerciseName: (s: string) => s.toLowerCase() }));
vi.mock("@/lib/muscleMap", () => ({ registerWorkoutMuscles: vi.fn() }));
vi.mock("@/lib/supabase", () => {
  const chain = (table: string): Record<string, unknown> => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
    q.maybeSingle = async () => ({ data: { id: "plan-1" }, error: null });
    q.then = (res: (v: unknown) => unknown) => res({ data: table === "workouts" ? h.workouts : [], error: null });
    return q;
  };
  return { supabase: { from: (t: string) => chain(t) } };
});

import { getMyWorkoutPlan } from "./workouts";

const ex = (id: string) => ({ id, name: `Ex ${id}`, muscle_groups: null, sets: 3, reps: 10, load_kg: null, rest_seconds: 60, gif_url: null, notes: null, order_index: 1 });

beforeEach(() => { h.workouts = []; });

describe("getMyWorkoutPlan: minutos e kcal do treino", () => {
  it("treino B com 1 exercício e sem estimated_minutes: não vira 0 Min / 0 kcal (estima pelas séries)", async () => {
    h.workouts = [{ id: "w2", letter: "B", name: "Peito", primary_muscle_group: null, day_index: 2, estimated_minutes: null, workout_exercises: [ex("1")] }];
    const [w] = await getMyWorkoutPlan();
    expect(w.exercises).toHaveLength(1);
    expect(w.estimatedMinutes).toBe(5); // 3 séries × (40 s + 60 s)
    expect(w.estimatedCalories).toBe(30);
  });
  it("estimated_minutes do cadastro vale; treino sem exercício fica sem tempo nem kcal", async () => {
    h.workouts = [
      { id: "w1", letter: "A", name: "A", primary_muscle_group: null, day_index: 1, estimated_minutes: 50, workout_exercises: [ex("1")] },
      { id: "w3", letter: "C", name: "C", primary_muscle_group: null, day_index: 3, estimated_minutes: null, workout_exercises: [] },
    ];
    const [a, c] = await getMyWorkoutPlan();
    expect([a.estimatedMinutes, a.estimatedCalories]).toEqual([50, 300]);
    expect([c.estimatedMinutes, c.estimatedCalories]).toEqual([0, 0]);
  });
});
