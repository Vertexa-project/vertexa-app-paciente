import { describe, it, expect } from "vitest";
import { deriveAdherenceConfig, adherenceStateFromSnapshot, getAdherenceState, type AdherenceLevel } from "./adherenceEngine";

const levelRank: Record<AdherenceLevel, number> = { risco: 0, baixa: 1, moderada: 2, alta: 3 };

const now = new Date(2026, 5, 25, 12, 0, 0); // 25 Jun 2026
const iso = (y: number, m: number, d: number, h = 8) => new Date(y, m, d, h, 0, 0).toISOString();

describe("deriveAdherenceConfig (inputs REAIS, fórmula inalterada)", () => {
  it("deriva daysWithoutInteraction do evento mais recente", () => {
    const cfg = deriveAdherenceConfig({
      events: [{ type: "hydration_logged", created_at: iso(2026, 5, 23) }],
      lastWeightAt: null,
      lastPhotoAt: null,
      now,
    });
    expect(cfg.daysWithoutInteraction).toBe(2);
  });

  it("conta hábitos de hoje e DIAS distintos de treino na semana", () => {
    const cfg = deriveAdherenceConfig({
      events: [
        { type: "hydration_logged", created_at: iso(2026, 5, 25, 8) },
        { type: "hydration_logged", created_at: iso(2026, 5, 25, 10) },
        { type: "mood_logged", created_at: iso(2026, 5, 25, 11) },
        { type: "workout_checked", created_at: iso(2026, 5, 24, 7) },
        { type: "workout_checked", created_at: iso(2026, 5, 24, 18) }, // mesmo dia -> 1 distinto
        { type: "workout_checked", created_at: iso(2026, 5, 20) },
      ],
      lastWeightAt: null,
      lastPhotoAt: null,
      now,
    });
    expect(cfg.habitsLoggedToday).toBe(3);
    expect(cfg.workoutsThisWeek).toBe(2); // dias 24 e 20 (ambos <=6 dias), distintos
  });

  it("marca peso recente (<=7d) e foto recente (<=30d)", () => {
    const recent = deriveAdherenceConfig({ events: [], lastWeightAt: iso(2026, 5, 20), lastPhotoAt: iso(2026, 5, 1), now });
    expect(recent.weightLoggedRecently).toBe(true);
    expect(recent.photoLoggedRecently).toBe(true);

    const stale = deriveAdherenceConfig({ events: [], lastWeightAt: iso(2026, 5, 10), lastPhotoAt: iso(2026, 4, 1), now });
    expect(stale.weightLoggedRecently).toBe(false); // 15 dias
    expect(stale.photoLoggedRecently).toBe(false); // ~55 dias
  });

  it("calcula streak de dias consecutivos terminando hoje", () => {
    const cfg = deriveAdherenceConfig({
      events: [
        { type: "hydration_logged", created_at: iso(2026, 5, 25) },
        { type: "hydration_logged", created_at: iso(2026, 5, 24) },
        { type: "hydration_logged", created_at: iso(2026, 5, 23) },
        { type: "hydration_logged", created_at: iso(2026, 5, 21) }, // gap no dia 22
      ],
      lastWeightAt: null,
      lastPhotoAt: null,
      now,
    });
    expect(cfg.streak).toBe(3);
  });

  it("conta streak a partir de ontem quando não há evento hoje", () => {
    const cfg = deriveAdherenceConfig({
      events: [
        { type: "hydration_logged", created_at: iso(2026, 5, 24) },
        { type: "hydration_logged", created_at: iso(2026, 5, 23) },
      ],
      lastWeightAt: null,
      lastPhotoAt: null,
      now,
    });
    expect(cfg.streak).toBe(2);
  });

  it("sem eventos -> config 'frio' (inativo)", () => {
    const cfg = deriveAdherenceConfig({ events: [], lastWeightAt: null, lastPhotoAt: null, now });
    expect(cfg.daysWithoutInteraction).toBe(30);
    expect(cfg.streak).toBe(0);
    expect(cfg.workoutsThisWeek).toBe(0);
    expect(cfg.habitsLoggedToday).toBe(0);
  });
});

describe("adherenceStateFromSnapshot (consistência app↔web a partir do snapshot)", () => {
  it("mapeia os campos persistidos e calcula a variação a partir do anterior", () => {
    const st = adherenceStateFromSnapshot(
      { score: 88, level: "alta", status: "em_acompanhamento", streak: 18, weeklyCompletionRate: 80, riskFactors: ["x"], positiveFactors: ["y"] },
      80
    );
    expect(st.score).toBe(88);
    expect(st.level).toBe("alta");
    expect(st.streak).toBe(18);
    expect(st.weeklyCompletionRate).toBe(80);
    expect(st.lastScoreChange).toBe(8);
    expect(st.contextualMessage.length).toBeGreaterThan(0);
  });

  it("lastScoreChange = 0 sem snapshot anterior", () => {
    const st = adherenceStateFromSnapshot({ score: 88, level: "alta", status: "em_acompanhamento", streak: 18, weeklyCompletionRate: 80, riskFactors: [], positiveFactors: [] });
    expect(st.lastScoreChange).toBe(0);
  });
});

describe("getAdherenceState (fórmula C6 intacta)", () => {
  it("paciente DEFAULT engajado satura no topo (alta)", () => {
    const s = getAdherenceState();
    expect(s.score).toBeGreaterThanOrEqual(80);
    expect(s.level).toBe("alta");
  });
});

describe("fator de ADESÃO ALIMENTAR (aditivo; preserva a Mariana — pendência #3)", () => {
  it("deriva mealAdherenceRatio de done/total; 0 sem plano ativo ou input ausente", () => {
    const withPlan = deriveAdherenceConfig({ events: [], lastWeightAt: null, lastPhotoAt: null, now, mealAdherenceToday: { done: 2, total: 4 } });
    expect(withPlan.mealAdherenceRatio).toBeCloseTo(0.5);

    const noPlan = deriveAdherenceConfig({ events: [], lastWeightAt: null, lastPhotoAt: null, now, mealAdherenceToday: { done: 0, total: 0 } });
    expect(noPlan.mealAdherenceRatio).toBe(0);

    const absent = deriveAdherenceConfig({ events: [], lastWeightAt: null, lastPhotoAt: null, now });
    expect(absent.mealAdherenceRatio).toBe(0);
  });

  it("é ADITIVO/não-negativo: nunca REDUZ o score nem REBAIXA o nível", () => {
    const bases: Parameters<typeof getAdherenceState>[0][] = [
      {},
      { daysWithoutInteraction: 5, habitsLoggedToday: 0, workoutsThisWeek: 1, weightLoggedRecently: false, streak: 0 },
      { daysWithoutInteraction: 2, habitsLoggedToday: 2, workoutsThisWeek: 3, streak: 10 },
      { daysWithoutInteraction: 20, habitsLoggedToday: 0, workoutsThisWeek: 0, weightLoggedRecently: false, streak: 0 },
    ];
    for (const base of bases) {
      const without = getAdherenceState({ ...base, mealAdherenceRatio: 0 });
      for (const ratio of [0.25, 0.5, 0.75, 1]) {
        const withMeals = getAdherenceState({ ...base, mealAdherenceRatio: ratio });
        expect(withMeals.score).toBeGreaterThanOrEqual(without.score);
        expect(levelRank[withMeals.level]).toBeGreaterThanOrEqual(levelRank[without.level]);
      }
    }
  });

  it("config engajada (Mariana-like) permanece >=88/alta com qualquer adesão alimentar", () => {
    // Perfil engajado que satura no topo (como a Mariana reconciliada 88/alta). O fator não a rebaixa.
    const marianaLike = { daysWithoutInteraction: 1, habitsLoggedToday: 3, workoutsThisWeek: 3, weightLoggedRecently: true, planViewedRecently: true, streak: 18 };
    const base = getAdherenceState({ ...marianaLike, mealAdherenceRatio: 0 });
    expect(base.score).toBeGreaterThanOrEqual(88);
    expect(base.level).toBe("alta");
    for (const ratio of [0, 0.33, 0.66, 1]) {
      const s = getAdherenceState({ ...marianaLike, mealAdherenceRatio: ratio });
      expect(s.score).toBeGreaterThanOrEqual(88);
      expect(s.level).toBe("alta");
    }
  });
});
