import { describe, expect, it } from "vitest";
import { curvePoints, vriBand, vriComponents, weakestComponent, type VriInputs } from "./vriBreakdown";

const BASE: VriInputs = {
  workoutDaysWeek: 4, weeklyCompletionRate: 80, hasWorkoutPlan: true,
  mealsDone: 3, mealsTotal: 4, suppTaken: 2, suppTotal: 2, weightDaysAgo: 2, photoDaysAgo: 10,
};
const by = (l: ReturnType<typeof vriComponents>, k: string) => l.find((c) => c.key === k)!;

describe("VRI sem caixa-preta (PDF do Ernâni, tela 14)", () => {
  it("monta os 4 componentes com dado real", () => {
    const l = vriComponents(BASE);
    expect(l.map((c) => c.key)).toEqual(["workout", "meals", "supplements", "records"]);
    expect(by(l, "workout")).toMatchObject({ pct: 80, detail: "4 de 5 treinos na semana" });
    expect(by(l, "meals")).toMatchObject({ pct: 75, detail: "3 de 4 refeições de hoje" });
    expect(by(l, "supplements")).toMatchObject({ pct: 100, detail: "2 de 2 de hoje" });
    expect(by(l, "records")).toMatchObject({ pct: 100, detail: "peso em dia · foto em dia" });
  });
  it("sem plano/lista não inventa percentual", () => {
    const l = vriComponents({ ...BASE, hasWorkoutPlan: false, mealsTotal: 0, mealsDone: 0, suppTotal: 0, suppTaken: 0 });
    expect(by(l, "workout").pct).toBeNull();
    expect(by(l, "meals").pct).toBeNull();
    expect(by(l, "supplements").pct).toBeNull();
    expect(by(l, "meals").detail).toBe("sem plano alimentar publicado");
  });
  it("registros: peso vale até 7 dias, foto até 30; metade cada", () => {
    expect(by(vriComponents({ ...BASE, weightDaysAgo: 8 }), "records")).toMatchObject({ pct: 50, detail: "peso atrasado · foto em dia" });
    expect(by(vriComponents({ ...BASE, weightDaysAgo: 7, photoDaysAgo: 31 }), "records")).toMatchObject({ pct: 50, detail: "peso em dia · foto pendente" });
    expect(by(vriComponents({ ...BASE, weightDaysAgo: null, photoDaysAgo: null }), "records").pct).toBe(0);
  });
  it("treino passa de 100% do servidor? limita em 100 e em 5 treinos", () => {
    const w = by(vriComponents({ ...BASE, weeklyCompletionRate: 140, workoutDaysWeek: 7 }), "workout");
    expect(w.pct).toBe(100);
    expect(w.detail).toBe("5 de 5 treinos na semana");
  });
  it("dica: o componente mais fraco entre os medíveis", () => {
    const w = weakestComponent(vriComponents(BASE))!;
    expect(w.component.key).toBe("meals");
    expect(w.tip).toMatch(/refeições/);
  });
  it("dica ignora o que não tem o que medir e some quando tudo está em 100%", () => {
    const l = vriComponents({ ...BASE, hasWorkoutPlan: false, mealsTotal: 0, mealsDone: 0, suppTaken: 1 });
    expect(weakestComponent(l)!.component.key).toBe("supplements");
    expect(weakestComponent(vriComponents({ ...BASE, weeklyCompletionRate: 100, mealsDone: 4 }))).toBeNull();
    expect(weakestComponent([])).toBeNull();
  });
  it("faixas do PDF: <50, 50–69, 70+", () => {
    expect([49, 50, 69, 70].map(vriBand)).toEqual(["baixa", "media", "media", "alta"]);
  });
  it("curva em ordem cronológica e limitada aos mais recentes", () => {
    const desc = [3, 2, 1].map((s) => ({ score: s, at: `2026-10-0${s}` }));
    expect(curvePoints(desc).map((p) => p.score)).toEqual([1, 2, 3]);
    expect(curvePoints(desc, 2).map((p) => p.score)).toEqual([2, 3]);
  });
});
