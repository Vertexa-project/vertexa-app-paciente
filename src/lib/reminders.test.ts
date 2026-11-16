import { describe, expect, it } from "vitest";

import { brtYmd } from "./restDay";
import { daysUntil, DEFAULT_TEMPLATES, patientSees, reminderCards, renderMessage, whenText, type ReminderRow } from "./reminders";

const row = (o: Partial<ReminderRow> = {}): ReminderRow => ({
  id: "r1", patient_id: "p1", kind: "return", title: null, due_on: "2026-11-30", notify_patient: true, notify_days_before: 7, message_template: null, done_at: null, ...o,
});

describe("lembretes no app: dia de Brasília", () => {
  it("a janela de aviso muda na virada do dia de Brasília (00:00 BRT = 03:00 UTC), não na do UTC", () => {
    const r = row({ due_on: "2026-12-08" });
    expect(patientSees(r, brtYmd(new Date("2026-12-01T02:59:00Z")))).toBe(false); // 23:59 de 30/11, faltam 8 dias
    expect(patientSees(r, brtYmd(new Date("2026-12-01T03:00:00Z")))).toBe(true); // 00:00 de 01/12, faltam 7
  });
});

describe("lembretes no app: o que o paciente vê", () => {
  it("dias e textos", () => {
    expect(daysUntil("2028-03-01", "2028-02-28")).toBe(2);
    expect([0, 1, -1, 5, -3].map(whenText)).toEqual(["hoje", "amanhã", "ontem", "em 5 dias", "há 3 dias"]);
  });
  it("janela própria, opt-in, tolerância de 7 dias depois da data e feito nunca aparece", () => {
    const r = row({ notify_days_before: 3 });
    expect(patientSees(r, "2026-11-26")).toBe(false);
    expect(patientSees(r, "2026-11-27")).toBe(true);
    expect(patientSees(r, "2026-11-30")).toBe(true);
    expect(patientSees(r, "2026-12-07")).toBe(true);
    expect(patientSees(r, "2026-12-08")).toBe(false);
    expect(patientSees({ ...r, notify_patient: false }, "2026-11-30")).toBe(false);
    expect(patientSees({ ...r, done_at: "2026-11-28T00:00:00Z" }, "2026-11-30")).toBe(false);
  });
  it("mudou a data na clínica: a mesma linha muda de fase e o texto acompanha (sem duplicar)", () => {
    const now = new Date("2026-11-27T15:00:00Z");
    const antes = row({ id: "x", due_on: "2026-11-30" });
    const depois = { ...antes, due_on: "2027-02-01" };
    expect(reminderCards([antes], "Mariana Teste", now).map((c) => c.id)).toEqual(["x"]);
    expect(reminderCards([depois], "Mariana Teste", now)).toEqual([]);
    expect(reminderCards([{ ...antes, due_on: "2026-12-02" }], "Mariana Teste", now)[0].message).toContain("em 5 dias, em 02/12/2026");
  });
  it("mensagem: padrão com nome e data pt-BR; texto da clínica vale; exame leva o nome do pedido", () => {
    const today = "2026-11-27";
    expect(renderMessage(row(), "Mariana Teste", today)).toBe("Olá, Mariana! Seu retorno com a clínica é em 3 dias, em 30/11/2026. Se precisar remarcar, fale com a sua equipe pelo app.");
    expect(renderMessage(row({ message_template: "{nome}, {data} ({quando})" }), "Mariana Teste", today)).toBe("Mariana, 30/11/2026 (em 3 dias)");
    expect(renderMessage(row({ kind: "exam", title: "Hemograma" }), "Mariana Teste", today)).toContain("o exame Hemograma deve ser feito até 30/11/2026 (em 3 dias)");
    expect(DEFAULT_TEMPLATES.exam).toContain("{exame}");
  });
  it("cards usam o dia de Brasília: 23:30 de 30/11 em BRT (02:30 UTC de 01/12) ainda faltam 8 dias; 00:30 já faltam 7", () => {
    const r = [row({ due_on: "2026-12-08" })];
    expect(reminderCards(r, "Ana", new Date("2026-12-01T02:30:00Z"))).toEqual([]);
    expect(reminderCards(r, "Ana", new Date("2026-12-01T03:30:00Z"))).toHaveLength(1);
  });
  it("cards: atrasado primeiro, depois o mais próximo; hoje marcado", () => {
    const now = new Date("2026-11-27T15:00:00Z");
    const cards = reminderCards([row({ id: "a", due_on: "2026-11-30" }), row({ id: "b", kind: "exam", title: "Ferritina", due_on: "2026-11-25" }), row({ id: "c", due_on: "2026-11-27" })], "Ana", now);
    expect(cards.map((c) => [c.id, c.headline, c.overdue, c.today])).toEqual([["b", "Exame: Ferritina", true, false], ["c", "Seu retorno", false, true], ["a", "Seu retorno", false, false]]);
  });
});
