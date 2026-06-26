import { describe, it, expect } from "vitest";
import { recoveryStatusForDays, recoveryStatusForLastTrained } from "@/lib/recoveryRule";

// Canonical day rule (CONTRATO #1 / types.ts MuscleStatus):
// 0-2 dias = fatigued · 3 = recovering · 4 = recovered · 5+ = weakened · sem histórico = neutral.
// O status exibido é DERIVADO de last_trained_at (o writer grava sempre 'fatigued'; não há recompute).
describe("recoveryStatusForDays", () => {
  it("treina hoje (0 dias) -> fatigued", () => {
    expect(recoveryStatusForDays(0)).toBe("fatigued");
  });

  it("1 dia -> fatigued", () => {
    expect(recoveryStatusForDays(1)).toBe("fatigued");
  });

  it("2 dias -> fatigued (borda superior da faixa fatigued)", () => {
    expect(recoveryStatusForDays(2)).toBe("fatigued");
  });

  it("3 dias -> recovering", () => {
    expect(recoveryStatusForDays(3)).toBe("recovering");
  });

  it("4 dias -> recovered", () => {
    expect(recoveryStatusForDays(4)).toBe("recovered");
  });

  it("5 dias -> weakened (borda inferior da faixa weakened)", () => {
    expect(recoveryStatusForDays(5)).toBe("weakened");
  });

  it("6+ dias -> weakened", () => {
    expect(recoveryStatusForDays(6)).toBe("weakened");
    expect(recoveryStatusForDays(30)).toBe("weakened");
  });

  it("sem histórico (null) -> neutral", () => {
    expect(recoveryStatusForDays(null)).toBe("neutral");
  });

  it("dias negativos (relógio adiantado) tratados como 0 -> fatigued, nunca neutral", () => {
    expect(recoveryStatusForDays(-1)).toBe("fatigued");
  });
});

describe("recoveryStatusForLastTrained (deriva de last_trained_at em fuso LOCAL)", () => {
  it("last_trained_at null -> neutral (sem estímulo registrado)", () => {
    expect(recoveryStatusForLastTrained(null, new Date(2026, 5, 26, 9, 0))).toBe("neutral");
  });

  it("treinado hoje cedo, agora -> fatigued", () => {
    const now = new Date(2026, 5, 26, 18, 0);
    const trained = new Date(2026, 5, 26, 7, 30).toISOString();
    expect(recoveryStatusForLastTrained(trained, now)).toBe("fatigued");
  });

  it("borda de meia-noite: treinado 23:30 de ontem, agora 00:30 -> conta 1 dia local -> fatigued", () => {
    const now = new Date(2026, 5, 26, 0, 30);
    const trained = new Date(2026, 5, 25, 23, 30).toISOString();
    expect(recoveryStatusForLastTrained(trained, now)).toBe("fatigued");
  });

  it("borda de faixa: 3 dias locais cheios -> recovering", () => {
    const now = new Date(2026, 5, 26, 12, 0);
    const trained = new Date(2026, 5, 23, 12, 0).toISOString();
    expect(recoveryStatusForLastTrained(trained, now)).toBe("recovering");
  });

  it("estímulo antigo (8 dias) -> weakened (caso real da Mariana hoje)", () => {
    const now = new Date(2026, 5, 26, 12, 0);
    const trained = new Date(2026, 5, 18, 23, 3).toISOString();
    expect(recoveryStatusForLastTrained(trained, now)).toBe("weakened");
  });
});
