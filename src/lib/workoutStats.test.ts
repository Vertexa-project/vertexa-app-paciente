import { describe, expect, it } from "vitest";

import { estimateKcal, estimateMinutes, warmupCountLabel, workoutMinutes, workoutSummaryLine } from "./workoutStats";

const ex = (sets: number, rest = 60) => ({ sets: Array.from({ length: sets }, () => ({ reps: 10, weight: 0, completed: false })), restSeconds: rest });

describe("números do treino (nunca 0 Min / 0 kcal com exercício)", () => {
  it("sem duração no cadastro, estima por séries × (execução + intervalo)", () => {
    // 3 séries × (40 + 60) s = 300 s = 5 min
    expect(estimateMinutes([ex(3)])).toBe(5);
    expect(estimateMinutes([ex(3), ex(4, 90)])).toBe(Math.round((300 + 4 * 130) / 60));
    expect(estimateMinutes([])).toBe(0);
  });
  it("a duração do cadastro vale quando existe; 0 ou nulo cai na estimativa", () => {
    expect(workoutMinutes(45, [ex(3)])).toBe(45);
    expect(workoutMinutes(0, [ex(3)])).toBe(5);
    expect(workoutMinutes(null, [ex(1, 0)])).toBe(1);
    expect(workoutMinutes(null, [])).toBe(0);
  });
  it("kcal derivada dos minutos; sem minutos, 0 (a tela esconde)", () => {
    expect(estimateKcal(5)).toBe(30);
    expect(estimateKcal(0)).toBe(0);
  });
  it("linha do treino: contagem real de exercícios e só o que existe", () => {
    expect(workoutSummaryLine({ exercises: [1], estimatedMinutes: 5, estimatedCalories: 30 })).toBe("1 exercício • ~5 min • ~30 kcal");
    expect(workoutSummaryLine({ exercises: [1, 2, 3], estimatedMinutes: 0, estimatedCalories: 0 })).toBe("3 exercícios");
  });
  it("a preparação conta movimentos de preparação, não exercícios do treino", () => {
    expect(warmupCountLabel(5)).toBe("5 movimentos de preparação");
    expect(warmupCountLabel(1)).toBe("1 movimento de preparação");
  });
});
