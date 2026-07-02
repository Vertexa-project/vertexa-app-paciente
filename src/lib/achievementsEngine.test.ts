import { describe, it, expect } from "vitest";
import {
  evaluateAchievements,
  deriveStreak,
  countWorkoutDays,
  ACHIEVEMENT_CODES,
  type AchievementFacts,
} from "./achievementsEngine";

const now = new Date(2026, 6, 2, 12, 0, 0); // 02 Jul 2026, meio-dia local
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h, 0, 0).toISOString();

// Base "tudo travado" — cada teste liga só o que precisa (evita falso-positivo por herança).
const LOCKED: AchievementFacts = {
  workoutDays: 0,
  hasWeightLog: false,
  hasPhoto: false,
  hasMealLog: false,
  hasActivitySession: false,
  hasSupplementIntake: false,
  streak: 0,
  kgLost: 0,
  reachedTarget: false,
};

describe("evaluateAchievements (puro/determinístico; NÃO alimenta o VRI)", () => {
  it("tudo travado -> nenhuma conquista", () => {
    expect(evaluateAchievements(LOCKED)).toEqual([]);
  });

  it("Mariana REAL (streak 18, 5,8 kg, treino/peso/foto reais; sem meal/activity/supplement) -> exatamente 7", () => {
    const mariana: AchievementFacts = {
      workoutDays: 4,
      hasWeightLog: true,
      hasPhoto: true,
      hasMealLog: false, // meal_logs vazio (D3 -> LOCKED)
      hasActivitySession: false, // activity_sessions vazio (D3 -> LOCKED)
      hasSupplementIntake: false, // supplement_intakes vazio (D3 -> LOCKED)
      streak: 18,
      kgLost: 5.8, // 74,2 - 68,4 (D2)
      reachedTarget: false, // 68,4 > 62
    };
    expect(evaluateAchievements(mariana)).toEqual([
      "first_workout",
      "first_weight",
      "first_photo",
      "streak_7",
      "streak_14",
      "weight_3kg",
      "weight_5kg",
    ]);
  });

  it("first_* destravam SÓ com o dado real da tabela-valor correspondente", () => {
    expect(evaluateAchievements({ ...LOCKED, workoutDays: 1 })).toEqual(["first_workout"]);
    expect(evaluateAchievements({ ...LOCKED, hasWeightLog: true })).toEqual(["first_weight"]);
    expect(evaluateAchievements({ ...LOCKED, hasPhoto: true })).toEqual(["first_photo"]);
    expect(evaluateAchievements({ ...LOCKED, hasMealLog: true })).toEqual(["first_meal_day"]);
    expect(evaluateAchievements({ ...LOCKED, hasActivitySession: true })).toEqual(["first_activity"]);
    expect(evaluateAchievements({ ...LOCKED, hasSupplementIntake: true })).toEqual(["first_supplement"]);
  });

  it("streak é escada: 6->nada, 7->+7, 14->+7/14, 30->+7/14/30", () => {
    expect(evaluateAchievements({ ...LOCKED, streak: 6 })).toEqual([]);
    expect(evaluateAchievements({ ...LOCKED, streak: 7 })).toEqual(["streak_7"]);
    expect(evaluateAchievements({ ...LOCKED, streak: 14 })).toEqual(["streak_7", "streak_14"]);
    expect(evaluateAchievements({ ...LOCKED, streak: 30 })).toEqual(["streak_7", "streak_14", "streak_30"]);
  });

  it("peso é por limiar (start_weight - current_weight): 2,9->nada, 3->3kg, 5->3kg+5kg", () => {
    expect(evaluateAchievements({ ...LOCKED, kgLost: 2.9 })).toEqual([]);
    expect(evaluateAchievements({ ...LOCKED, kgLost: 3 })).toEqual(["weight_3kg"]);
    expect(evaluateAchievements({ ...LOCKED, kgLost: 5 })).toEqual(["weight_3kg", "weight_5kg"]);
    expect(evaluateAchievements({ ...LOCKED, kgLost: 5.8 })).toEqual(["weight_3kg", "weight_5kg"]);
  });

  it("weight_target destrava quando o paciente alcança o alvo", () => {
    expect(evaluateAchievements({ ...LOCKED, reachedTarget: true })).toEqual(["weight_target"]);
  });

  it("saída respeita a ordem do catálogo (sort_order) e só contém codes válidos", () => {
    const all = evaluateAchievements({
      workoutDays: 9,
      hasWeightLog: true,
      hasPhoto: true,
      hasMealLog: true,
      hasActivitySession: true,
      hasSupplementIntake: true,
      streak: 40,
      kgLost: 10,
      reachedTarget: true,
    });
    expect(all).toEqual([...ACHIEVEMENT_CODES]); // todas, na ordem do catálogo
    expect(new Set(all).size).toBe(all.length); // sem duplicatas
  });

  it("é DETERMINÍSTICA: mesma entrada -> saída idêntica", () => {
    const f: AchievementFacts = { ...LOCKED, streak: 18, kgLost: 5.8, workoutDays: 4, hasWeightLog: true };
    expect(evaluateAchievements(f)).toEqual(evaluateAchievements(f));
  });
});

describe("deriveStreak (dias consecutivos terminando hoje/ontem; espelha a regra do adherenceEngine)", () => {
  it("18 dias consecutivos terminando hoje -> 18 (baseline do seed rolante da Mariana)", () => {
    const events = Array.from({ length: 18 }, (_, i) => ({ created_at: at(2026, 6, 2 - i) }));
    expect(deriveStreak(events, now)).toBe(18);
  });

  it("ancorado em ONTEM quando não há evento hoje", () => {
    const events = [
      { created_at: at(2026, 6, 1) }, // ontem
      { created_at: at(2026, 5, 30) }, // anteontem
    ];
    expect(deriveStreak(events, now)).toBe(2);
  });

  it("um buraco quebra a sequência", () => {
    const events = [
      { created_at: at(2026, 6, 2) }, // hoje
      { created_at: at(2026, 6, 1) }, // ontem
      // 30 jun ausente (buraco)
      { created_at: at(2026, 5, 29) },
    ];
    expect(deriveStreak(events, now)).toBe(2);
  });

  it("múltiplos eventos no mesmo dia contam como 1 dia", () => {
    const events = [
      { created_at: at(2026, 6, 2, 8) },
      { created_at: at(2026, 6, 2, 20) },
    ];
    expect(deriveStreak(events, now)).toBe(1);
  });

  it("sem eventos -> 0", () => {
    expect(deriveStreak([], now)).toBe(0);
  });
});

describe("countWorkoutDays (DIAS distintos; guard #13 = deduplica started+completed)", () => {
  it("dois workout_checked no MESMO dia (started+completed) contam como 1", () => {
    const events = [
      { type: "workout_checked", created_at: at(2026, 6, 2, 8) },
      { type: "workout_checked", created_at: at(2026, 6, 2, 9) },
    ];
    expect(countWorkoutDays(events)).toBe(1);
  });

  it("conta dias distintos e ignora outros tipos de evento", () => {
    const events = [
      { type: "workout_checked", created_at: at(2026, 6, 2) },
      { type: "workout_checked", created_at: at(2026, 5, 30) },
      { type: "hydration_logged", created_at: at(2026, 5, 28) }, // ignora
    ];
    expect(countWorkoutDays(events)).toBe(2);
  });

  it("sem treinos -> 0 (first_workout fica travada)", () => {
    expect(countWorkoutDays([{ type: "hydration_logged", created_at: at(2026, 6, 2) }])).toBe(0);
  });
});
