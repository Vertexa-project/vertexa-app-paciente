import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("@/lib/api", () => ({ getMyReminders: vi.fn(async () => api.rows) }));
vi.mock("@/hooks/useMe", () => ({ useMe: () => ({ me: { name: "Mariana Teste" }, isLoading: false, isError: false }) }));

import ClinicReminders from "./ClinicReminders";

const row = (o: object) => ({ id: "r", patient_id: "p", kind: "return", title: null, due_on: "2026-11-30", notify_patient: true, notify_days_before: 7, message_template: null, done_at: null, ...o });
const view = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClinicReminders /></QueryClientProvider>);

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-27T15:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("Avisos da clínica no Início (A2)", () => {
  it("retorno dentro da janela: card com a mensagem da clínica, data pt-BR e quanto falta", async () => {
    api.rows = [row({ message_template: "Oi {nome}! Retorno em {data}." })];
    view();
    expect(await screen.findByText("Seu retorno")).toBeInTheDocument();
    expect(screen.getByText("Oi Mariana! Retorno em 30/11/2026.")).toBeInTheDocument();
    expect(screen.getByText("em 3 dias · 30/11/2026")).toBeInTheDocument();
  });
  it("exame atrasado aparece marcado; retorno distante não aparece", async () => {
    api.rows = [row({ id: "e", kind: "exam", title: "Ferritina", due_on: "2026-11-25" }), row({ id: "f", due_on: "2027-01-10" })];
    view();
    expect(await screen.findByText("Exame: Ferritina")).toBeInTheDocument();
    expect(screen.getByText("Atrasado · 25/11/2026")).toBeInTheDocument();
    expect(screen.queryByText("Seu retorno")).toBeNull();
  });
  it("sem lembrete na janela não desenha nada", async () => {
    api.rows = [row({ due_on: "2027-03-01" })];
    const { container } = view();
    await Promise.resolve();
    expect(container.querySelector("section")).toBeNull();
  });
});
