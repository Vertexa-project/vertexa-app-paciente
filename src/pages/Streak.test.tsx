import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { localDateKey } from "@/lib/pendingLogic";

const api = vi.hoisted(() => ({ streak: 3 as number | null, events: [] as unknown[], rest: [] as string[], throws: false }));

vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => { if (api.throws) throw new Error("x"); return api.streak === null ? null : { streak: api.streak }; }),
  getActivityEventsSince: vi.fn(async () => api.events),
  getRestDays: vi.fn(async () => api.rest),
  markRestDay: vi.fn(), undoRestDay: vi.fn(), getMyClinicBrand: vi.fn(async () => null),
}));

const { default: Streak } = await import("./Streak");

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><Streak /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { api.streak = 3; api.events = []; api.rest = []; api.throws = false; });

describe("Tela da sequência (PDF do Ernâni, tela 07) — regra atual", () => {
  it("mostra o número de dias seguidos do servidor, no singular quando 1", async () => {
    renderIt();
    expect(await screen.findByTestId("streak-hero")).toHaveTextContent("3");
    expect(screen.getByTestId("streak-hero")).toHaveTextContent("dias seguidos");
  });
  it("singular", async () => {
    api.streak = 1;
    renderIt();
    expect(await screen.findByText("dia seguido")).toBeInTheDocument();
  });
  it("a semana mostra hoje com registro como feito", async () => {
    api.events = [{ type: "meal_logged", created_at: new Date().toISOString() }];
    renderIt();
    const week = await screen.findByTestId("streak-week");
    await vi.waitFor(() => expect(week.querySelector(`[data-state="done"]`)).not.toBeNull());
  });
  it("dia de descanso marcado aparece como descanso", async () => {
    api.rest = [localDateKey(new Date())];
    renderIt();
    const week = await screen.findByTestId("streak-week");
    await vi.waitFor(() => expect(week.querySelector(`[data-state="rest"]`)).not.toBeNull());
  });
  it("explica a regra REAL: qualquer registro conta, descanso não quebra, abrir o app não conta — sem prometer 80%", async () => {
    renderIt();
    const rule = await screen.findByTestId("streak-rule");
    expect(rule).toHaveTextContent("qualquer registro seu do plano");
    expect(rule).toHaveTextContent("Abrir o app não conta");
    expect(rule).not.toHaveTextContent("80%");
  });
  it("próximo marco: 3 dias → 7, faltam 4", async () => {
    renderIt();
    expect(await screen.findByTestId("streak-next")).toHaveTextContent("Próximo marco: 7 dias");
  });
  it("falha de leitura: avisa", async () => {
    api.throws = true;
    renderIt();
    expect(await screen.findByText("Não foi possível carregar sua sequência.")).toBeInTheDocument();
  });
});
