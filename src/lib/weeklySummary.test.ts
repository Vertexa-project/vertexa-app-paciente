import { describe, expect, it } from "vitest";
import { buildWeeklySummary, rangeLabel, scoreBefore, weekDays, weekStart, type WeeklyInputs } from "./weeklySummary";

// 21/10/2026 é quarta-feira → semana de 19/10 (seg) a 25/10 (dom)
const WED = new Date(2026, 9, 21, 15, 0);
const SUN = new Date(2026, 9, 25, 21, 0);

const BASE: WeeklyInputs = {
  today: WED, workouts: [], sessions: [], plannedWorkoutDays: 5, mealLogs: [], mealsPerDay: 4, streak: 3, score: 84, scoreAtWeekStart: 78,
};

describe("resumo da semana (PDF do Ernâni, tela 17)", () => {
  it("semana vai de segunda a domingo", () => {
    expect(weekStart(WED).getDay()).toBe(1);
    expect(weekDays(weekStart(WED))[0]).toBe("2026-10-19");
    expect(weekDays(weekStart(WED))[6]).toBe("2026-10-25");
    expect(weekStart(new Date(2026, 9, 25)).getDate()).toBe(19); // domingo pertence à semana que termina nele
  });

  it("kcal por dia soma treino + atividade; dias futuros ficam 0", () => {
    const s = buildWeeklySummary({ ...BASE,
      workouts: [{ day: "2026-10-19", kcal: 300 }, { day: "2026-10-20", kcal: 300 }],
      sessions: [{ day: "2026-10-19", kcal: 180 }, { day: "2026-10-23", kcal: 999 }] }); // dia 23 é futuro
    expect(s.kcalByDay).toEqual([480, 300, 0, 0, 0, 0, 0]);
    expect(s.kcalTotal).toBe(780);
    expect(s.kcalAvgPerDay).toBe(260); // 780 / 3 dias já passados (seg, ter, qua)
  });

  it("variação contra a semana anterior; sem base, nada", () => {
    const withPrev = buildWeeklySummary({ ...BASE, workouts: [{ day: "2026-10-19", kcal: 540 }, { day: "2026-10-12", kcal: 500 }] });
    expect(withPrev.kcalVsPrevPct).toBe(8);
    expect(buildWeeklySummary({ ...BASE, workouts: [{ day: "2026-10-19", kcal: 540 }] }).kcalVsPrevPct).toBeNull();
  });

  it("treinos: dias distintos na semana, não eventos", () => {
    const s = buildWeeklySummary({ ...BASE, workouts: [{ day: "2026-10-19", kcal: 1 }, { day: "2026-10-19", kcal: 1 }, { day: "2026-10-20", kcal: 1 }, { day: "2026-10-12", kcal: 1 }] });
    expect(s.workoutsDone).toBe(2);
    expect(s.workoutsPlanned).toBe(5);
  });

  it("refeições: marcadas / (por dia × dias já passados)", () => {
    const logs = Array.from({ length: 6 }, () => ({ consumed_on: "2026-10-20" })).concat([{ consumed_on: "2026-10-30" }]); // futuro não conta
    expect(buildWeeklySummary({ ...BASE, mealLogs: logs }).mealsPct).toBe(Math.round((6 / 12) * 100));
    expect(buildWeeklySummary({ ...BASE, mealsPerDay: 0 }).mealsPct).toBeNull();
  });

  it("VRI: variação desde o começo da semana; sem base, nada", () => {
    expect(buildWeeklySummary(BASE).vriDelta).toBe(6);
    expect(buildWeeklySummary({ ...BASE, scoreAtWeekStart: null }).vriDelta).toBeNull();
    expect(scoreBefore([{ score: 90, at: "2026-10-20T10:00:00" }, { score: 78, at: "2026-10-15T10:00:00" }], weekStart(WED))).toBe(78);
    expect(scoreBefore([{ score: 90, at: "2026-10-20T10:00:00" }], weekStart(WED))).toBeNull();
  });

  it("semana fechada só no domingo", () => {
    expect(buildWeeklySummary(BASE).isClosed).toBe(false);
    expect(buildWeeklySummary({ ...BASE, today: SUN }).isClosed).toBe(true);
  });

  it("intervalo em português, com virada de mês", () => {
    expect(rangeLabel("2026-10-19", "2026-10-25")).toBe("19 a 25 out");
    expect(rangeLabel("2026-10-26", "2026-11-01")).toBe("26 out a 1 nov");
  });
});
