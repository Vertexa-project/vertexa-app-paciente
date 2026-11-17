import { describe, expect, it } from "vitest";

import { cardTitle, dayMonthBR, examFileProblem, examObjectPath, homeCardState, type PreConsultaRow } from "./preConsulta";

const row = (o: Partial<PreConsultaRow> = {}): PreConsultaRow => ({ id: "1", appointment_starts_at: "2026-11-25T15:00:00Z", status: "enviada", questions: [], answers: {}, sent_at: "2026-11-20T12:00:00Z", answered_at: null, ...o });
const now = new Date("2026-11-22T12:00:00Z");

describe("pré-consulta no app: regras puras", () => {
  it("data em Brasília e título do cartão", () => {
    expect(dayMonthBR("2026-11-25T02:30:00Z")).toBe("24/11");
    expect(cardTitle("25/11")).toBe("Pré-consulta da sua consulta de 25/11");
    expect(cardTitle("")).toBe("Pré-consulta");
  });
  it("cartão do Início: responder, rascunho, enviada por 7 dias, some se cancelada ou consulta passou", () => {
    expect(homeCardState(row(), now)).toEqual({ kind: "responder", when: "25/11", draft: false });
    expect(homeCardState(row({ status: "rascunho" }), now)).toEqual({ kind: "responder", when: "25/11", draft: true });
    expect(homeCardState(row({ status: "respondida", answered_at: "2026-11-21T12:00:00Z" }), now)).toEqual({ kind: "enviada", when: "25/11" });
    expect(homeCardState(row({ status: "respondida", answered_at: "2026-11-10T12:00:00Z" }), now)).toBeNull();
    expect(homeCardState(row({ status: "cancelada" }), now)).toBeNull();
    expect(homeCardState(row({ appointment_starts_at: "2026-11-10T12:00:00Z" }), now)).toBeNull();
    expect(homeCardState(null, now)).toBeNull();
    expect(homeCardState(row({ appointment_starts_at: null }), now)).toEqual({ kind: "responder", when: "", draft: false });
  });
  it("arquivo de exame: só PDF/foto, até 15 MB, até 10 arquivos", () => {
    expect(examFileProblem({ type: "application/pdf", size: 1000 }, 0)).toBeNull();
    expect(examFileProblem({ type: "image/jpeg", size: 1000 }, 9)).toBeNull();
    expect(examFileProblem({ type: "application/zip", size: 1000 }, 0)).toMatch(/PDF ou foto/);
    expect(examFileProblem({ type: "application/pdf", size: 16 * 1024 * 1024 }, 0)).toMatch(/15 MB/);
    expect(examFileProblem({ type: "application/pdf", size: 0 }, 0)).toMatch(/vazio/);
    expect(examFileProblem({ type: "application/pdf", size: 10 }, 10)).toMatch(/10 arquivos/);
  });
  it("caminho no storage: <paciente>/pre-consulta/<uuid>.<ext>", () => {
    expect(examObjectPath("pat", "application/pdf", "u1")).toBe("pat/pre-consulta/u1.pdf");
    expect(examObjectPath("pat", "image/png", "u2")).toBe("pat/pre-consulta/u2.png");
  });
});
