import { describe, expect, it } from "vitest";
import { noteBand, weeklyNote } from "./weeklyNote";
import type { WeeklySummary } from "./weeklySummary";

const S = (o: Partial<WeeklySummary> = {}): WeeklySummary => ({
  rangeStart: "2026-10-19", rangeEnd: "2026-10-25", isClosed: true, kcalByDay: [0, 0, 0, 0, 0, 0, 0], kcalTotal: 0, kcalAvgPerDay: null, kcalVsPrevPct: null,
  workoutsDone: 0, workoutsPlanned: 0, streak: 0, vriDelta: null, score: null, mealsPct: null, ...o,
});

describe("recado automático por faixa", () => {
  it("fecha: 80% ou mais é forte, 50–79 é boa, abaixo de 50 é leve (média de treino e refeições)", () => {
    expect(noteBand(S({ workoutsDone: 4, workoutsPlanned: 5, mealsPct: 80 }), 7)).toBe("forte");
    expect(noteBand(S({ workoutsDone: 3, workoutsPlanned: 5, mealsPct: 50 }), 7)).toBe("boa");
    expect(noteBand(S({ workoutsDone: 1, workoutsPlanned: 5, mealsPct: 40 }), 7)).toBe("leve");
  });
  it("limites exatos: 80% é forte e 50% é boa", () => {
    expect(noteBand(S({ workoutsDone: 4, workoutsPlanned: 5 }), 7)).toBe("forte");
    expect(noteBand(S({ workoutsDone: 1, workoutsPlanned: 2 }), 7)).toBe("boa");
  });
  it("usa só o que existe: sem refeições no plano, vale o treino; treino acima do previsto não passa de 100%", () => {
    expect(noteBand(S({ workoutsDone: 7, workoutsPlanned: 5, mealsPct: 10 }), 7)).toBe("boa"); // (1 + 0,1)/2 = 55%
    expect(noteBand(S({ workoutsDone: 1, workoutsPlanned: 5 }), 7)).toBe("leve");
  });
  it("sem plano nenhum: algum movimento é 'boa', nenhum é 'início'", () => {
    expect(noteBand(S({ workoutsDone: 2 }), 7)).toBe("boa");
    expect(noteBand(S({ kcalTotal: 120 }), 7)).toBe("boa");
    expect(noteBand(S(), 7)).toBe("inicio");
  });
  it("semana aberta antes do 4º dia: andamento, sem julgar", () => {
    expect(noteBand(S({ isClosed: false, workoutsDone: 0, workoutsPlanned: 5 }), 3)).toBe("andamento");
    expect(noteBand(S({ isClosed: false, workoutsDone: 0, workoutsPlanned: 5 }), 4)).toBe("leve");
  });
  it("recado da equipe vence o automático, e o texto vazio cai no automático", () => {
    expect(weeklyNote(S(), " Vamos subir a carga! ", 7)).toEqual({ text: "Vamos subir a carga!", source: "team" });
    expect(weeklyNote(S(), "   ", 7).source).toBe("auto");
    expect(weeklyNote(S(), null, 7).source).toBe("auto");
  });
});
