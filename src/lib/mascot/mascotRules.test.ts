import { describe, expect, it } from "vitest";

import { mascotSpeech, shouldCelebrate, streakHeadline, type MascotGoal } from "./mascotRules";

const g = (id: MascotGoal["id"], current: number, target: number): MascotGoal => ({ id, current, target });

describe("mascotSpeech", () => {
  it("falta só a água: 'Falta a água para fechar o dia.' + sequência", () => {
    const s = mascotSpeech({ streak: 3, goals: [g("water", 1.5, 2.5), g("meals", 5, 5), g("workout", 1, 1)] });
    expect(s.headline).toBe("3 dias seguidos");
    expect(s.line).toBe("Falta a água para fechar o dia.");
    expect(s.allDone).toBe(false);
    expect(s.doneCount).toBe(2);
    expect(s.total).toBe(3);
  });

  it("concordância: uma meta no plural usa 'Faltam'", () => {
    expect(mascotSpeech({ streak: 0, goals: [g("meals", 3, 5)] }).line).toBe("Faltam as refeições para fechar o dia.");
    expect(mascotSpeech({ streak: 0, goals: [g("workout", 0, 1)] }).line).toBe("Falta o treino para fechar o dia.");
    expect(mascotSpeech({ streak: 0, goals: [g("meds", 0, 2)] }).line).toBe("Faltam os remédios para fechar o dia.");
  });

  it("tudo feito: 'Dia fechado!'", () => {
    const s = mascotSpeech({ streak: 5, goals: [g("water", 2.5, 2.5), g("meals", 5, 5)] });
    expect(s.line).toBe("Dia fechado!");
    expect(s.allDone).toBe(true);
  });

  it("várias faltando: lista na ordem água, refeições, treino, remédios", () => {
    const s = mascotSpeech({ streak: 0, goals: [g("meds", 0, 2), g("workout", 0, 1), g("water", 0, 2.5), g("meals", 2, 5)] });
    expect(s.line).toBe("Faltam a água, as refeições, o treino e os remédios para fechar o dia.");
    expect(s.headline).toBeNull();
    const two = mascotSpeech({ streak: 1, goals: [g("water", 0, 2.5), g("workout", 0, 1)] });
    expect(two.line).toBe("Faltam a água e o treino para fechar o dia.");
    expect(two.headline).toBe("1 dia seguido");
  });

  it("meta sem dado (alvo 0, NaN) some: não conta e não é citada", () => {
    const s = mascotSpeech({ streak: 2, goals: [g("water", 1, 2.5), g("meals", 0, 0), g("workout", Number.NaN, 1)] });
    expect(s.total).toBe(1);
    expect(s.line).toBe("Falta a água para fechar o dia.");
    expect(s.line).not.toMatch(/refei|treino/);
  });

  it("sem nenhuma meta com dado: fala neutra, nunca 'Dia fechado!'", () => {
    const s = mascotSpeech({ streak: 4, goals: [] });
    expect(s.allDone).toBe(false);
    expect(s.line).not.toMatch(/fechado/i);
    expect(s.total).toBe(0);
  });

  it("nunca fala de peso, gordura, exame, resultado ou elogio clínico, em nenhuma combinação", () => {
    const FORBIDDEN = /peso|kg|gordura|exame|resultado|emagre|barriga|imc|%|parab[ée]ns|incr[ií]vel|arras/i;
    const ids = ["water", "meals", "workout", "meds"] as const;
    for (let mask = 0; mask < 16; mask++) {
      for (const cur of [0, 1]) {
        for (const streak of [null, 0, 1, 7, 120]) {
          const goals = ids.filter((_, i) => mask & (1 << i)).map((id) => g(id, cur, 1));
          const s = mascotSpeech({ streak, goals });
          expect(`${s.headline ?? ""} ${s.line}`).not.toMatch(FORBIDDEN);
        }
      }
    }
  });
});

describe("streakHeadline / shouldCelebrate", () => {
  it("sequência", () => {
    expect(streakHeadline(null)).toBeNull();
    expect(streakHeadline(0)).toBeNull();
    expect(streakHeadline(1)).toBe("1 dia seguido");
    expect(streakHeadline(12)).toBe("12 dias seguidos");
  });
  it("só comemora quando sobe depois de carregado", () => {
    expect(shouldCelebrate(null, 3)).toBe(false);
    expect(shouldCelebrate(1, 1)).toBe(false);
    expect(shouldCelebrate(2, 1)).toBe(false);
    expect(shouldCelebrate(1, 2)).toBe(true);
  });
});
