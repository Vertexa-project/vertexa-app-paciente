import { describe, it, expect } from "vitest";
import { deriveAdherenceConfig, adherenceStateFromSnapshot, getAdherenceState } from "./adherenceEngine";

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
