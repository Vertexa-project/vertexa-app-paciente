import { describe, expect, it } from "vitest";
import { nextStreakMilestone, weekStates } from "./streakWeek";

const WED = new Date(2026, 9, 21, 15, 0); // semana 19→25/10
const at = (day: string, h = 10) => `${day}T${String(h).padStart(2, "0")}:00:00`;

describe("sequência (PDF do Ernâni, tela 07) — regra atual do servidor", () => {
  it("registro de adesão marca o dia; dia de descanso aparece como descanso; passado sem nada é falta", () => {
    const s = weekStates([{ type: "meal_logged", created_at: at("2026-10-19") }], ["2026-10-20"], WED);
    expect(s.map((x) => x.state)).toEqual(["done", "rest", "today", "future", "future", "future", "future"]);
  });
  it("hoje com registro vira 'done'; dia passado sem nada é 'missed'", () => {
    const s = weekStates([{ type: "workout_checked", created_at: at("2026-10-21") }], [], WED);
    expect(s.map((x) => x.state).slice(0, 3)).toEqual(["missed", "missed", "done"]);
  });
  it("pedir ajuda (SOS) não conta como dia cumprido", () => {
    const s = weekStates([{ type: "help_requested", created_at: at("2026-10-19") }], [], WED);
    expect(s[0].state).toBe("missed");
  });
  it("registro e descanso no mesmo dia: conta como feito", () => {
    const s = weekStates([{ type: "hydration_logged", created_at: at("2026-10-20") }], ["2026-10-20"], WED);
    expect(s[1].state).toBe("done");
  });
  it("dia perdoado pelo servidor aparece como protegido; registro e descanso vencem", () => {
    const s = weekStates([{ type: "meal_logged", created_at: at("2026-10-19") }], ["2026-10-21"], WED, ["2026-10-20", "2026-10-19", "2026-10-21"]);
    expect(s.map((x) => x.state).slice(0, 3)).toEqual(["done", "protected", "rest"]);
  });
  it("sem dias protegidos, a falha segue como falta", () => {
    expect(weekStates([], [], WED)[0].state).toBe("missed");
  });
  it("próximo marco da sequência: 3 → 7, 7 → 14, 90+ → nenhum", () => {
    expect(nextStreakMilestone(3)).toEqual({ target: 7, remaining: 4 });
    expect(nextStreakMilestone(7)).toEqual({ target: 14, remaining: 7 });
    expect(nextStreakMilestone(89)).toEqual({ target: 90, remaining: 1 });
    expect(nextStreakMilestone(90)).toBeNull();
  });
});
