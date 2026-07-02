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

describe("getAdherenceState (banda C7): engajado fica alto, sem cravar o teto", () => {
  it("paciente DEFAULT engajado fica alto (>=80/alta) mas NÃO crava 100", () => {
    const s = getAdherenceState();
    expect(s.score).toBeGreaterThanOrEqual(80);
    expect(s.score).toBeLessThan(100);
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

describe("fator de ATIVIDADE COMPLEMENTAR (aditivo; preserva a Mariana — pendência #3)", () => {
  it("deriva complementaryActivityDaysThisWeek = DIAS distintos com activity_logged nos últimos 7", () => {
    const cfg = deriveAdherenceConfig({
      events: [
        { type: "activity_logged", created_at: iso(2026, 5, 25, 7) },
        { type: "activity_logged", created_at: iso(2026, 5, 25, 19) }, // mesmo dia -> 1 distinto
        { type: "activity_logged", created_at: iso(2026, 5, 23) },
        { type: "activity_logged", created_at: iso(2026, 5, 10) }, // >6 dias -> fora da janela
        { type: "hydration_logged", created_at: iso(2026, 5, 24) }, // outro tipo -> não conta
      ],
      lastWeightAt: null,
      lastPhotoAt: null,
      now,
    });
    expect(cfg.complementaryActivityDaysThisWeek).toBe(2); // dias 25 e 23
  });

  it("0 quando não há activity_logged (input compatível com o antigo)", () => {
    const cfg = deriveAdherenceConfig({
      events: [{ type: "hydration_logged", created_at: iso(2026, 5, 25) }],
      lastWeightAt: null,
      lastPhotoAt: null,
      now,
    });
    expect(cfg.complementaryActivityDaysThisWeek).toBe(0);
  });

  it("é ADITIVO/não-negativo: nunca REDUZ o score nem REBAIXA o nível", () => {
    const bases: Parameters<typeof getAdherenceState>[0][] = [
      {},
      { daysWithoutInteraction: 5, habitsLoggedToday: 0, workoutsThisWeek: 1, weightLoggedRecently: false, streak: 0 },
      { daysWithoutInteraction: 2, habitsLoggedToday: 2, workoutsThisWeek: 3, streak: 10 },
      { daysWithoutInteraction: 20, habitsLoggedToday: 0, workoutsThisWeek: 0, weightLoggedRecently: false, streak: 0 },
    ];
    for (const base of bases) {
      const without = getAdherenceState({ ...base, complementaryActivityDaysThisWeek: 0 });
      for (const days of [1, 2, 3, 5, 7]) {
        const withActivity = getAdherenceState({ ...base, complementaryActivityDaysThisWeek: days });
        expect(withActivity.score).toBeGreaterThanOrEqual(without.score);
        expect(levelRank[withActivity.level]).toBeGreaterThanOrEqual(levelRank[without.level]);
      }
    }
  });

  it("combina com adesão alimentar sem NUNCA reduzir (os dois fatores são aditivos)", () => {
    const base = { daysWithoutInteraction: 3, habitsLoggedToday: 1, workoutsThisWeek: 2, weightLoggedRecently: false, streak: 4 };
    const none = getAdherenceState({ ...base, mealAdherenceRatio: 0, complementaryActivityDaysThisWeek: 0 });
    const both = getAdherenceState({ ...base, mealAdherenceRatio: 1, complementaryActivityDaysThisWeek: 3 });
    expect(both.score).toBeGreaterThanOrEqual(none.score);
    expect(levelRank[both.level]).toBeGreaterThanOrEqual(levelRank[none.level]);
  });

  it("config engajada (Mariana-like) permanece >=88/alta com qualquer atividade complementar", () => {
    const marianaLike = { daysWithoutInteraction: 1, habitsLoggedToday: 3, workoutsThisWeek: 3, weightLoggedRecently: true, planViewedRecently: true, streak: 18 };
    const base = getAdherenceState({ ...marianaLike, complementaryActivityDaysThisWeek: 0 });
    expect(base.score).toBeGreaterThanOrEqual(88);
    expect(base.level).toBe("alta");
    for (const days of [0, 1, 2, 3, 5, 7]) {
      const s = getAdherenceState({ ...marianaLike, complementaryActivityDaysThisWeek: days });
      expect(s.score).toBeGreaterThanOrEqual(88);
      expect(s.level).toBe("alta");
    }
  });
});

describe("fator de SUPLEMENTOS (aditivo; respeita o soft-cap C7 e a Mariana convergente 96)", () => {
  // Config da Mariana CONVERGENTE pós-SEED (janela rolante de 18d): evento hoje, 4 treinos/semana,
  // peso/foto/plano recentes, streak 18 -> engine = 96/alta (baseline a232d1a4). NÃO pode regredir.
  const marianaConvergente = {
    daysWithoutInteraction: 0,
    habitsLoggedToday: 1,
    workoutsThisWeek: 4,
    weightLoggedRecently: true,
    photoLoggedRecently: true,
    planViewedRecently: true,
    streak: 18,
  };

  it("deriva supplementAdherenceRatio de taken/total; 0 sem lista ou input ausente", () => {
    const withList = deriveAdherenceConfig({ events: [], lastWeightAt: null, lastPhotoAt: null, now, supplementAdherenceToday: { taken: 2, total: 5 } });
    expect(withList.supplementAdherenceRatio).toBeCloseTo(0.4);

    const noList = deriveAdherenceConfig({ events: [], lastWeightAt: null, lastPhotoAt: null, now, supplementAdherenceToday: { taken: 0, total: 0 } });
    expect(noList.supplementAdherenceRatio).toBe(0);

    const absent = deriveAdherenceConfig({ events: [], lastWeightAt: null, lastPhotoAt: null, now });
    expect(absent.supplementAdherenceRatio).toBe(0);
  });

  it("é ADITIVO/não-negativo: nunca REDUZ o score nem REBAIXA o nível", () => {
    const bases: Parameters<typeof getAdherenceState>[0][] = [
      {},
      { daysWithoutInteraction: 5, habitsLoggedToday: 0, workoutsThisWeek: 1, weightLoggedRecently: false, streak: 0 },
      { daysWithoutInteraction: 20, habitsLoggedToday: 0, workoutsThisWeek: 0, weightLoggedRecently: false, streak: 0 },
      marianaConvergente,
    ];
    for (const base of bases) {
      const without = getAdherenceState({ ...base, supplementAdherenceRatio: 0 });
      for (const ratio of [0.2, 0.4, 0.6, 0.8, 1]) {
        const withSupp = getAdherenceState({ ...base, supplementAdherenceRatio: ratio });
        expect(withSupp.score).toBeGreaterThanOrEqual(without.score);
        expect(levelRank[withSupp.level]).toBeGreaterThanOrEqual(levelRank[without.level]);
      }
    }
  });

  it("Mariana convergente (96/alta) NÃO regride e NÃO crava 100 com suplementos", () => {
    const base = getAdherenceState({ ...marianaConvergente, supplementAdherenceRatio: 0 });
    expect(base.score).toBeGreaterThanOrEqual(96);
    expect(base.level).toBe("alta");
    for (const ratio of [0, 0.2, 0.6, 1]) {
      const s = getAdherenceState({ ...marianaConvergente, supplementAdherenceRatio: ratio });
      expect(s.score).toBeGreaterThanOrEqual(base.score); // nunca regride
      expect(s.level).toBe("alta");
      expect(s.score).toBeLessThan(100); // soft-cap respeitado: reforço, não teto
    }
  });

  it("combina com os outros fatores aditivos sem NUNCA reduzir", () => {
    const base = { daysWithoutInteraction: 3, habitsLoggedToday: 1, workoutsThisWeek: 2, weightLoggedRecently: false, streak: 4 };
    const none = getAdherenceState({ ...base, mealAdherenceRatio: 0, complementaryActivityDaysThisWeek: 0, supplementAdherenceRatio: 0 });
    const all = getAdherenceState({ ...base, mealAdherenceRatio: 1, complementaryActivityDaysThisWeek: 3, supplementAdherenceRatio: 1 });
    expect(all.score).toBeGreaterThanOrEqual(none.score);
    expect(levelRank[all.level]).toBeGreaterThanOrEqual(levelRank[none.level]);
  });
});

describe("calibração do VRI (C7): perfil REAL da Mariana lande ~88, NÃO crava 100", () => {
  // Eventos REAIS da Mariana (confirmados via MCP): workout+hidratação @29/06, peso @28/06, foto @25/06.
  // now fixo = 02/07 (a mesma janela em que o VRI vivo saturava em 100 nas S1/S2).
  const nowJul2 = new Date(2026, 6, 2, 12, 0, 0);
  const marianaRealEvents = [
    { type: "workout_checked", created_at: iso(2026, 5, 29) },
    { type: "hydration_logged", created_at: iso(2026, 5, 29) },
    { type: "weight_logged", created_at: iso(2026, 5, 28) },
    { type: "progress_photo_uploaded", created_at: iso(2026, 5, 25) },
  ];
  const marianaRealConfig = (extra: { type: string; created_at: string }[] = []) =>
    deriveAdherenceConfig({
      events: [...marianaRealEvents, ...extra],
      lastWeightAt: iso(2026, 5, 28),
      lastPhotoAt: iso(2026, 5, 25),
      now: nowJul2,
    });

  it("perfil real da Mariana HOJE lande na banda [85,92]/alta e >= 88 (NÃO 100)", () => {
    const s = getAdherenceState(marianaRealConfig());
    expect(s.level).toBe("alta");
    expect(s.score).toBeGreaterThanOrEqual(85);
    expect(s.score).toBeLessThanOrEqual(92);
    expect(s.score).toBeGreaterThanOrEqual(88); // piso da demo (#3)
    expect(s.score).not.toBe(100);
  });

  it("uma ação isolada HOJE é um NUDGE pequeno e crível, não crava 100", () => {
    const passive = getAdherenceState(marianaRealConfig());
    const withAction = getAdherenceState(
      marianaRealConfig([{ type: "hydration_logged", created_at: iso(2026, 6, 2, 9) }])
    );
    expect(withAction.score).toBeGreaterThanOrEqual(passive.score); // monotônico
    expect(withAction.score - passive.score).toBeLessThanOrEqual(5); // nudge pequeno, não salto
    expect(withAction.score).toBeLessThan(100);
    expect(withAction.level).toBe("alta");
  });

  it("o topo (100) fica RESERVADO ao quase-perfeito; DEFAULT engajado fica alto mas NÃO crava 100", () => {
    const almostPerfect = getAdherenceState({
      daysWithoutInteraction: 0,
      habitsLoggedToday: 4,
      workoutsThisWeek: 4,
      weightLoggedRecently: true,
      photoLoggedRecently: true,
      planViewedRecently: true,
      streak: 30,
      mealAdherenceRatio: 1,
      complementaryActivityDaysThisWeek: 3,
    });
    expect(almostPerfect.score).toBe(100);

    const def = getAdherenceState();
    expect(def.level).toBe("alta");
    expect(def.score).toBeGreaterThanOrEqual(80);
    expect(def.score).toBeLessThan(100);
  });
});
