import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { localDateKey } from "@/lib/pendingLogic";

const today = new Date();
const iso = (d: Date, h = 10) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).toISOString();

const api = vi.hoisted(() => ({ fail: false }));
vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => ({ score: 84, streak: 5 })),
  getAdherenceHistory: vi.fn(async () => []),
  getActivitySessionsSince: vi.fn(async () => [{ performed_at: iso(new Date()), calories: 100 }, { performed_at: iso(new Date()), calories: null }]),
  getWorkoutCompletionsSince: vi.fn(async () => {
    if (api.fail) throw new Error("x");
    return [{ created_at: iso(new Date()), workoutId: "w1" }, { created_at: iso(new Date()), workoutId: "desconhecido" }, { created_at: iso(new Date()), workoutId: null }];
  }),
  getMealLogsSince: vi.fn(async () => []),
  getMealAdherenceToday: vi.fn(async () => ({ done: 0, total: 4 })),
  getMyWorkoutPlan: vi.fn(async () => [{ id: "w1", estimatedCalories: 300 }]),
}));

const { useWeeklySummary } = await import("./useWeeklySummary");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useWeeklySummary", () => {
  it("kcal de hoje = kcal do treino do plano + atividades; treino desconhecido ou sem id soma 0", async () => {
    const { result } = renderHook(() => useWeeklySummary(), { wrapper });
    await waitFor(() => expect(result.current.summary).not.toBeNull());
    const s = result.current.summary!;
    const idx = (today.getDay() + 6) % 7;
    expect(s.kcalByDay[idx]).toBe(400); // 300 (w1) + 100 (atividade) + 0 + 0 + 0 (sem calorias)
    expect(s.workoutsDone).toBe(1);     // três conclusões no mesmo dia = 1 dia
    expect(s.workoutsPlanned).toBe(1);
    expect(s.streak).toBe(5);
    expect(localDateKey(today) >= s.rangeStart && localDateKey(today) <= s.rangeEnd).toBe(true);
  });
  it("falha em qualquer leitura vira erro, sem resumo parcial", async () => {
    api.fail = true;
    const { result } = renderHook(() => useWeeklySummary(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.summary).toBeNull();
    api.fail = false;
  });
});
