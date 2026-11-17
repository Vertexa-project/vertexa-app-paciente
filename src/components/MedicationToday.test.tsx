import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ today: { enabled: false } as unknown, confirm: vi.fn(async () => undefined) }));
vi.mock("@/lib/api/medication", () => ({ getMedToday: vi.fn(async () => api.today), confirmMedApplication: api.confirm }));
import MedicationToday from "./MedicationToday";

const view = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MedicationToday /></QueryClientProvider>);
beforeEach(() => api.confirm.mockClear());

describe("Cartão da aplicação no Início", () => {
  it("lembrete desligado: não desenha nada", async () => {
    api.today = { enabled: false };
    const { container } = view();
    await Promise.resolve();
    expect(container.querySelector("section")).toBeNull();
  });
  it("dia da aplicação: cartão e 'Já apliquei' grava com o id do tratamento", async () => {
    api.today = { enabled: true, state: "today", medication: "Tirzepatida", dose_mg: 5, treatment_id: "t9" };
    view();
    expect(await screen.findByText("Hoje é dia da sua aplicação: Tirzepatida 5 mg")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Já apliquei" }));
    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith("t9"));
  });
  it("atrasada: mostra 'Aplicação atrasada'", async () => {
    api.today = { enabled: true, state: "overdue", days_late: 2, medication: "Tirzepatida", dose_mg: 2.5, treatment_id: "t1" };
    view();
    expect(await screen.findByText("Aplicação atrasada")).toBeInTheDocument();
    expect(screen.getByText(/há 2 dias/)).toBeInTheDocument();
  });
  it("erro ao gravar mostra aviso em português", async () => {
    api.today = { enabled: true, state: "today", medication: "Tirzepatida", dose_mg: 5, treatment_id: "t9" };
    api.confirm.mockRejectedValueOnce(new Error("rede"));
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Já apliquei" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível registrar agora");
  });
});
