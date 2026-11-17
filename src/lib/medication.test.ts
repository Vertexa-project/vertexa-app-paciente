import { describe, expect, it } from "vitest";

import { formatMg, medCard, medConfirmError } from "./medication";

const base = { enabled: true, medication: "Tirzepatida", dose_mg: 2.5, treatment_id: "t" };
describe("Aplicação de medicação no Início (A3)", () => {
  it("no dia: 'Hoje é dia da sua aplicação: Tirzepatida 2,5 mg' com o botão Já apliquei", () => {
    expect(medCard({ ...base, state: "today" })).toEqual({ overdue: false, headline: "Hoje é dia da sua aplicação: Tirzepatida 2,5 mg", detail: null, button: "Já apliquei" });
  });
  it("passou do dia: Aplicação atrasada (ontem / há N dias)", () => {
    expect(medCard({ ...base, state: "overdue", days_late: 1 })?.detail).toMatch(/Tirzepatida 2,5 mg · era ontem/);
    const c = medCard({ ...base, state: "overdue", days_late: 3 });
    expect(c?.headline).toBe("Aplicação atrasada");
    expect(c?.overdue).toBe(true);
    expect(c?.detail).toMatch(/há 3 dias/);
  });
  it("clínica com o lembrete desligado, em dia, sem tratamento ou ainda não começou: nada aparece", () => {
    expect(medCard({ enabled: false })).toBeNull();
    expect(medCard({ ...base, enabled: false, state: "today" })).toBeNull();
    for (const s of ["ok", "none", "upcoming", "ended"] as const) expect(medCard({ ...base, state: s })).toBeNull();
    expect(medCard(undefined)).toBeNull();
  });
  it("mg com vírgula; erro do servidor em português", () => {
    expect(formatMg(10)).toBe("10 mg");
    expect(medConfirmError({ message: "NOTHING_DUE" })).toMatch(/já está registrada/);
    expect(medConfirmError(new Error("x"))).toMatch(/Tente de novo/);
  });
});
