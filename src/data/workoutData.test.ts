import { describe, it, expect } from "vitest";
import { getWarmupForWorkout, getWarmupFocusLabel, workoutSchedule } from "./workoutData";

// Fluxo de "Preparação": antes era mobilidade/ativação (GIFs externos quebrados).
// Agora é o "Treino de membros superiores" com 5 exercícios de asset REAL (bundle).
describe("fluxo de preparação — Treino de membros superiores", () => {
  const prep = getWarmupForWorkout(workoutSchedule[0]);

  it("tem exatamente 5 exercícios", () => {
    expect(prep).toHaveLength(5);
  });

  it("usa os 5 exercícios de membros superiores, na ordem definida", () => {
    const got = prep.map((p) => ({
      name: p.name,
      focusArea: p.focusArea,
      reps: p.reps,
      durationSeconds: p.durationSeconds,
    }));
    expect(got).toEqual([
      { name: "Face Pull na Polia", focusArea: "Ombros, trapézio e costas", reps: 12, durationSeconds: 30 },
      { name: "Elevação Lateral", focusArea: "Ombros", reps: 12, durationSeconds: 30 },
      { name: "Desenvolvimento com Halteres", focusArea: "Ombros e tríceps", reps: 10, durationSeconds: 35 },
      { name: "Flexão de Braço", focusArea: "Peito, ombros e tríceps", reps: 10, durationSeconds: 25 },
      { name: "Encolhimento com Barra", focusArea: "Trapézio", reps: 12, durationSeconds: 25 },
    ]);
  });

  it("não contém mais os exercícios de mobilidade antigos", () => {
    const names = prep.map((p) => p.name);
    for (const old of [
      "Círculos de ombro",
      "Rotação torácica",
      "Passa e repassa",
      "Extensão torácica",
      "Ativação escapular",
    ]) {
      expect(names).not.toContain(old);
    }
    expect(prep.some((p) => /mobilidade|ativação escapular/i.test(p.instruction))).toBe(false);
  });

  it("cada exercício aponta para um GIF local empacotado (sem URL externa, não vazio)", () => {
    for (const ex of prep) {
      expect(typeof ex.gifUrl).toBe("string");
      expect(ex.gifUrl).not.toMatch(/^https?:\/\//); // nada de fitnessprogramer.com
      expect(ex.gifUrl.length).toBeGreaterThan(0); // asset resolvido pelo bundle
    }
  });

  it("a preparação é a mesma para qualquer treino do dia (membros superiores)", () => {
    const baseNames = prep.map((p) => p.name);
    for (const w of workoutSchedule) {
      expect(getWarmupForWorkout(w).map((p) => p.name)).toEqual(baseNames);
      expect(getWarmupFocusLabel(w)).toBe("membros superiores");
    }
  });
});
