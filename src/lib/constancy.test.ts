import { describe, it, expect } from "vitest";
import { deriveConstancy, countWorkoutDaysInWindow } from "./constancy";

const now = new Date(2026, 6, 2, 12, 0, 0); // 02 Jul 2026, meio-dia local
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h, 0, 0).toISOString();

describe("deriveConstancy (determinística; mata o Math.random)", () => {
  it("marca dias ativos distintos na janela e conta certo", () => {
    const events = [
      { created_at: at(2026, 6, 2) }, // hoje (d0)
      { created_at: at(2026, 6, 2, 20) }, // hoje de novo -> mesmo dia, 1 ativo
      { created_at: at(2026, 6, 1) }, // ontem (d1)
      { created_at: at(2026, 5, 29) }, // 3 dias atrás (d3)
    ];
    const c = deriveConstancy(events, now, 7);
    expect(c.windowDays).toBe(7);
    expect(c.days).toHaveLength(7);
    expect(c.activeCount).toBe(3); // 02, 01, 29
    expect(c.rate).toBe(Math.round((3 / 7) * 100)); // 43
    // a última célula (mais recente) é hoje e está ativa
    expect(c.days[c.days.length - 1]).toEqual({ dateKey: "2026-07-02", active: true });
    // penúltima é ontem, ativa
    expect(c.days[c.days.length - 2].active).toBe(true);
  });

  it("ignora eventos fora da janela", () => {
    const events = [
      { created_at: at(2026, 6, 2) }, // d0 (dentro)
      { created_at: at(2026, 5, 20) }, // 12 dias atrás (fora de 7d, dentro de 14d)
    ];
    expect(deriveConstancy(events, now, 7).activeCount).toBe(1);
    expect(deriveConstancy(events, now, 14).activeCount).toBe(2);
  });

  it("escala com windowDays (o seletor 7/14/28 muda a saída)", () => {
    // 18 dias consecutivos terminando hoje (imita o seed rolante da Mariana)
    const events = Array.from({ length: 18 }, (_, i) => ({ created_at: at(2026, 6, 2 - i) }));
    expect(deriveConstancy(events, now, 7).activeCount).toBe(7); // 7/7 = 100%
    expect(deriveConstancy(events, now, 7).rate).toBe(100);
    expect(deriveConstancy(events, now, 14).activeCount).toBe(14); // 14/14 = 100%
    expect(deriveConstancy(events, now, 28).activeCount).toBe(18); // 18/28 = 64%
    expect(deriveConstancy(events, now, 28).rate).toBe(64);
  });

  it("é DETERMINÍSTICA: mesma entrada -> saída idêntica (recarregar 2x bate igual)", () => {
    const events = [{ created_at: at(2026, 6, 2) }, { created_at: at(2026, 5, 30) }];
    const a = deriveConstancy(events, now, 28);
    const b = deriveConstancy(events, now, 28);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("sem eventos -> tudo inativo (estado vazio honesto, não mock)", () => {
    const c = deriveConstancy([], now, 28);
    expect(c.activeCount).toBe(0);
    expect(c.rate).toBe(0);
    expect(c.days.every((d) => !d.active)).toBe(true);
  });
});

describe("countWorkoutDaysInWindow (DIAS distintos; deduplica started+completed)", () => {
  it("conta dias distintos com workout_checked dentro da janela", () => {
    const events = [
      { type: "workout_checked", created_at: at(2026, 6, 2) },
      { type: "workout_checked", created_at: at(2026, 5, 30) }, // d2
      { type: "hydration_logged", created_at: at(2026, 6, 2) }, // outro tipo -> ignora
      { type: "workout_checked", created_at: at(2026, 5, 20) }, // d12 (fora de 7)
    ];
    expect(countWorkoutDaysInWindow(events, now, 7)).toBe(2);
    expect(countWorkoutDaysInWindow(events, now, 14)).toBe(3);
  });

  it("DOIS workout_checked no MESMO dia (WorkoutGuide started+completed) contam como 1", () => {
    const events = [
      { type: "workout_checked", created_at: at(2026, 6, 2, 8) }, // started
      { type: "workout_checked", created_at: at(2026, 6, 2, 9) }, // completed, mesmo dia
    ];
    expect(countWorkoutDaysInWindow(events, now, 7)).toBe(1); // não dobra
  });
});
