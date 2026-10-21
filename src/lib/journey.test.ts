import { describe, it, expect } from "vitest";
import { deriveJourney, type JourneyAchievementInput } from "./journey";

const now = new Date(2026, 6, 2, 12, 0, 0); // 02 Jul 2026

// Catálogo da Mariana com as datas retroativas aprovadas (7 destravadas + 5 travadas).
const marianaAchievements: JourneyAchievementInput[] = [
  { code: "first_workout", title: "Primeiro treino", description: "d", icon: "🏋️", unlocked: true, unlockedAt: "2026-06-26T15:00:00Z" },
  { code: "first_weight", title: "Primeiro peso registrado", description: "d", icon: "⚖️", unlocked: true, unlockedAt: "2026-05-13T01:24:09Z" },
  { code: "first_photo", title: "Primeira foto de progresso", description: "d", icon: "📸", unlocked: true, unlockedAt: "2026-04-02T12:00:00Z" },
  { code: "first_meal_day", title: "Primeira refeição marcada", description: "d", icon: "🥗", unlocked: false, unlockedAt: null },
  { code: "first_activity", title: "Primeira atividade complementar", description: "d", icon: "🏃", unlocked: false, unlockedAt: null },
  { code: "first_supplement", title: "Primeiro suplemento tomado", description: "d", icon: "💊", unlocked: false, unlockedAt: null },
  { code: "streak_7", title: "7 dias de constância", description: "d", icon: "🔥", unlocked: true, unlockedAt: "2026-06-21T15:00:00Z" },
  { code: "streak_14", title: "14 dias de constância", description: "d", icon: "🔥", unlocked: true, unlockedAt: "2026-06-28T15:00:00Z" },
  { code: "streak_30", title: "30 dias de constância", description: "d", icon: "🏆", unlocked: false, unlockedAt: null },
  { code: "weight_3kg", title: "3 kg eliminados", description: "d", icon: "⚖️", unlocked: true, unlockedAt: "2026-05-20T01:24:09Z" },
  { code: "weight_5kg", title: "5 kg eliminados", description: "d", icon: "🎯", unlocked: true, unlockedAt: "2026-06-10T01:24:09Z" },
  { code: "weight_target", title: "Peso-alvo atingido", description: "d", icon: "🌟", unlocked: false, unlockedAt: null },
];

describe("deriveJourney (jornada real; substitui o mock, sem tocar o adherenceEngine)", () => {
  it("Mariana: dia 169, 8 completados (onboarding + 7), 13 no total", () => {
    const j = deriveJourney({ startDate: "2026-01-15", now, achievements: marianaAchievements });
    expect(j.dayNumber).toBe(169); // 15/01 -> 02/07 = 168 dias, +1 (start = dia 1)
    expect(j.completedCount).toBe(8);
    expect(j.totalCount).toBe(13);
    expect(j.startDate).toBe("2026-01-15");
  });

  it("marcos completados vêm em ORDEM CRONOLÓGICA, onboarding primeiro", () => {
    const j = deriveJourney({ startDate: "2026-01-15", now, achievements: marianaAchievements });
    const completedIds = j.checkpoints.filter((c) => c.completed).map((c) => c.id);
    expect(completedIds).toEqual([
      "onboarding",   // 15/01
      "first_photo",  // 02/04
      "first_weight", // 13/05
      "weight_3kg",   // 20/05
      "weight_5kg",   // 10/06
      "streak_7",     // 21/06
      "first_workout",// 26/06
      "streak_14",    // 28/06
    ]);
  });

  it("marcos TRAVADOS ficam por último (marcos futuros, sem data)", () => {
    const j = deriveJourney({ startDate: "2026-01-15", now, achievements: marianaAchievements });
    const locked = j.checkpoints.filter((c) => !c.completed);
    expect(locked.map((c) => c.id)).toEqual([
      "first_meal_day",
      "first_activity",
      "first_supplement",
      "streak_30",
      "weight_target",
    ]);
    expect(locked.every((c) => c.date === null)).toBe(true);
  });

  it("sem start_date: dia 0 e onboarding fica travado (não inventa data)", () => {
    const j = deriveJourney({ startDate: null, now, achievements: [] });
    expect(j.dayNumber).toBe(0);
    const onboarding = j.checkpoints.find((c) => c.id === "onboarding");
    expect(onboarding?.completed).toBe(false);
    expect(onboarding?.date).toBeNull();
  });

  it("sem conquistas destravadas: só onboarding completado", () => {
    const locked = marianaAchievements.map((a) => ({ ...a, unlocked: false, unlockedAt: null }));
    const j = deriveJourney({ startDate: "2026-01-15", now, achievements: locked });
    expect(j.completedCount).toBe(1); // só onboarding
    expect(j.checkpoints[0].id).toBe("onboarding");
  });

  it("é DETERMINÍSTICA: mesma entrada -> saída idêntica", () => {
    const a = deriveJourney({ startDate: "2026-01-15", now, achievements: marianaAchievements });
    const b = deriveJourney({ startDate: "2026-01-15", now, achievements: marianaAchievements });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("marcos de 30/60/90 dias (PDF do Ernâni, tela 06)", () => {
  it("próximo marco: dia 9 → 30 (faltam 21); dia 30 já passou para 60; dia 89 → 90; depois de 90 nenhum", async () => {
    const { nextDayMilestone } = await import("./journey");
    expect(nextDayMilestone(9)).toEqual({ day: 30, current: 9, remaining: 21 });
    expect(nextDayMilestone(30)).toEqual({ day: 60, current: 30, remaining: 30 });
    expect(nextDayMilestone(89)).toEqual({ day: 90, current: 89, remaining: 1 });
    expect(nextDayMilestone(90)).toBeNull();
    expect(nextDayMilestone(0)).toBeNull();
  });
  it("'Início em 17 set' sem escorregar de dia pelo fuso", async () => {
    const { startedOnLabel } = await import("./journey");
    expect(startedOnLabel("2026-09-17")).toBe("Início em 17 set");
    expect(startedOnLabel(null)).toBeNull();
  });
});

describe("fase pelo tempo de acompanhamento (decisão de 21/10)", () => {
  it("limites 14/30/60/90: o último dia de cada fase e o primeiro da seguinte", async () => {
    const { phaseForDay } = await import("./journey");
    expect([1, 14].map(phaseForDay)).toEqual(["inicio", "inicio"]);
    expect([15, 30].map(phaseForDay)).toEqual(["constancia_inicial", "constancia_inicial"]);
    expect([31, 60].map(phaseForDay)).toEqual(["acompanhamento_ativo", "acompanhamento_ativo"]);
    expect([61, 90].map(phaseForDay)).toEqual(["revisao_progresso", "revisao_progresso"]);
    expect([91, 400].map(phaseForDay)).toEqual(["manutencao", "manutencao"]);
  });
  it("dia do acompanhamento: início = dia 1, sem data = 0", async () => {
    const { dayNumberFor } = await import("./journey");
    expect(dayNumberFor("2026-10-01", new Date(2026, 9, 1, 23))).toBe(1);
    expect(dayNumberFor("2026-10-01", new Date(2026, 9, 15))).toBe(15);
    expect(dayNumberFor(null, new Date())).toBe(0);
  });
});
