import { describe, expect, it } from "vitest";
import { missionProgressText, missionVisible, routineSummary, routineTitle, shouldCelebrateMission, stepRoute, weekdayOf, type MissionView, type RoutineCurrent } from "./routineCards";

const cur = (key: RoutineCurrent["key"], due_on: string, state: RoutineCurrent["state"] = "due_today"): RoutineCurrent => ({ key, label: key, due_on, state });

describe("A4 · texto do cartão da rotina", () => {
  it("2026-11-20 é sexta (data de Brasília, sem passar por fuso)", () => {
    expect(weekdayOf("2026-11-20")).toBe("sexta");
    expect(weekdayOf("2026-11-22")).toBe("domingo");
    expect(weekdayOf("lixo")).toBe("hoje");
  });
  it("'Rotina de sexta: foto da balança em jejum, como foi a semana'", () => {
    const c = [cur("weight", "2026-11-20"), cur("feedback", "2026-11-20")];
    expect(`${routineTitle(c)}: ${routineSummary(c)}`).toBe("Rotina de sexta: foto da balança em jejum, como foi a semana");
  });
  it("o dia do título é o da ocorrência aberta mais antiga (atrasado)", () => {
    expect(routineTitle([cur("feedback", "2026-11-20"), cur("photo", "2026-11-13", "overdue")])).toBe("Rotina de sexta");
    expect(routineTitle([cur("feedback", "2026-11-20"), cur("photo", "2026-11-18", "overdue")])).toBe("Rotina de quarta");
  });
});

describe("A5 · missão", () => {
  it("cada passo leva à tela de registro certa; suplementos e bio são no próprio cartão", () => {
    expect(stepRoute("photo_front")).toBe("/records?tab=photo&pose=front");
    expect(stepRoute("photo_side")).toBe("/records?tab=photo&pose=side");
    expect(stepRoute("photo_back")).toBe("/records?tab=photo&pose=back");
    expect(stepRoute("weight")).toBe("/records?tab=weight");
    expect(stepRoute("supplements_photo")).toBeNull();
    expect(stepRoute("bio")).toBeNull();
  });
  const base: MissionView = { enabled: true, started: true, done_count: 6, total: 6, completed: true, completed_on: "2026-11-17", celebrated: false };
  it("'parabéns' só quando concluiu e ainda não foi mostrado", () => {
    expect(shouldCelebrateMission(base)).toBe(true);
    expect(shouldCelebrateMission({ ...base, celebrated: true })).toBe(false);
    expect(shouldCelebrateMission({ ...base, completed: false })).toBe(false);
    expect(shouldCelebrateMission({ ...base, enabled: false })).toBe(false);
    expect(shouldCelebrateMission(null)).toBe(false);
  });
  it("cartão: aparece em andamento; concluída fica 7 dias e some; desligada/sem início não aparece", () => {
    expect(missionVisible({ ...base, completed: false, celebrated: false }, "2026-11-30")).toBe(true);
    expect(missionVisible({ ...base, celebrated: true }, "2026-11-24")).toBe(true);
    expect(missionVisible({ ...base, celebrated: true }, "2026-11-25")).toBe(false);
    expect(missionVisible({ ...base, celebrated: false }, "2026-12-30")).toBe(true); // parabéns ainda não visto
    expect(missionVisible({ enabled: false, started: false }, "2026-11-17")).toBe(false);
    expect(missionVisible({ enabled: true, started: false }, "2026-11-17")).toBe(false);
  });
  it("progresso 'x de y'", () => expect(missionProgressText({ done_count: 2, total: 6 })).toBe("2 de 6"));
});
