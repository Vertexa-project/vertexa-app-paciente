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
