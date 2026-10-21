import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  logActivityEvent: vi.fn(async () => undefined),
  recomputeAdherence: vi.fn(async () => undefined),
  recomputeAchievements: vi.fn(async () => undefined),
}));

vi.mock("@/lib/api", () => ({
  getMyPatientId: vi.fn(async () => "pat-1"),
  logActivityEvent: m.logActivityEvent,
  recomputeAdherence: m.recomputeAdherence,
  recomputeAchievements: m.recomputeAchievements,
}));
vi.mock("@/lib/queryClient", () => ({ queryClient: { invalidateQueries: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const { tracker } = await import("@/lib/eventTracker");
const { startEventSync } = await import("./eventSync");

const settle = () => new Promise((r) => setTimeout(r, 20));

describe("esforço percebido no eventSync (PDF do Ernâni, tela 23)", () => {
  it("grava o esforço no banco, mas NÃO recalcula VRI nem conquistas; o treino concluído continua recalculando", async () => {
    startEventSync();

    tracker.track("workout_effort", { workoutId: "w1", effort: 8 });
    await settle();
    expect(m.logActivityEvent).toHaveBeenCalledWith({ patientId: "pat-1", type: "workout_effort", payload: { workoutId: "w1", effort: 8 } });
    expect(m.recomputeAdherence).not.toHaveBeenCalled();
    expect(m.recomputeAchievements).not.toHaveBeenCalled();

    tracker.track("workout_checked", { workoutId: "w1", action: "completed" });
    await settle();
    expect(m.recomputeAdherence).toHaveBeenCalledTimes(1);
    expect(m.recomputeAchievements).toHaveBeenCalledTimes(1);
  });
});
