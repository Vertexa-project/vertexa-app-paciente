import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  state: null as unknown,
  history: [] as unknown[],
  throws: false,
  meals: { done: 3, total: 4 },
  supps: { taken: 2, total: 2 },
  pending: { weightDaysAgo: 2, photoDaysAgo: 10 } as unknown,
  plan: [{ id: "w" }] as unknown[],
}));

vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => { if (api.throws) throw new Error("x"); return api.state; }),
  getAdherenceHistory: vi.fn(async () => api.history),
  getMealAdherenceToday: vi.fn(async () => api.meals),
  getSupplementAdherenceToday: vi.fn(async () => api.supps),
  getPendingSummary: vi.fn(async () => api.pending),
  getMyWorkoutPlan: vi.fn(async () => api.plan),
  getMyClinicBrand: vi.fn(async () => null),
}));

const { default: VriDetail } = await import("./VriDetail");

const STATE = { score: 84, level: "alta", status: "em_acompanhamento", journeyPhase: "inicio", daysSinceLastInteraction: 0, streak: 9, weeklyCompletionRate: 80, riskFactors: [], positiveFactors: [], contextualMessage: "", lastScoreChange: 6 };

function renderVri() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><VriDetail /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  api.state = STATE; api.throws = false;
  api.history = [{ score: 84, at: "2026-10-21" }, { score: 70, at: "2026-10-18" }, { score: 55, at: "2026-10-15" }];
  api.meals = { done: 3, total: 4 }; api.supps = { taken: 2, total: 2 };
  api.pending = { weightDaysAgo: 2, photoDaysAgo: 10 }; api.plan = [{ id: "w" }];
});

describe("Tela do VRI (PDF do Ernâni, tela 14)", () => {
  it("mostra o número do servidor, a faixa e a variação", async () => {
    renderVri();
    const hero = await screen.findByTestId("vri-hero");
    expect(hero).toHaveTextContent("84");
    expect(hero).toHaveTextContent("70 ou mais");
    expect(hero).toHaveTextContent("+6 desde a última medição");
  });
  it("curva com os pontos reais", async () => {
    renderVri();
    const curve = await screen.findByTestId("vri-curve");
    await within(curve).findByRole("img", { name: "Curva do VRI com 3 pontos, de 55 a 84" });
    expect(curve).toHaveTextContent("3 medições");
  });
  it("os 4 componentes com o dado real, sem somar o VRI", async () => {
    renderVri();
    const box = await screen.findByTestId("vri-components");
    await within(box).findByText("3 de 4 refeições de hoje");
    for (const t of ["Treino", "Alimentação", "Suplementação", "Registros de peso e foto", "4 de 5 treinos na semana", "peso em dia · foto em dia"]) {
      expect(within(box).getByText(t)).toBeInTheDocument();
    }
    expect(box).toHaveTextContent(/não um recálculo|Mostra o que você fez/);
  });
  it("a dica aponta o componente mais fraco (alimentação)", async () => {
    renderVri();
    const tip = await screen.findByTestId("vri-tip");
    await vi.waitFor(() => expect(tip).toHaveTextContent("Alimentação é o que mais puxa seu índice."));
  });
  it("sem plano alimentar: traço no lugar do percentual e a dica não cita alimentação", async () => {
    api.meals = { done: 0, total: 0 }; api.supps = { taken: 1, total: 2 };
    renderVri();
    const box = await screen.findByTestId("vri-components");
    await within(box).findByText("sem plano alimentar publicado");
    expect(within(box).getByText("—")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByTestId("vri-tip")).toHaveTextContent("Suplementação"));
  });
  it("sem snapshot: estado vazio honesto, sem número", async () => {
    api.state = null;
    renderVri();
    expect(await screen.findByText(/aparece depois dos seus primeiros registros/)).toBeInTheDocument();
    expect(screen.queryByTestId("vri-hero")).not.toBeInTheDocument();
  });
  it("falha de leitura: avisa e oferece tentar de novo", async () => {
    api.throws = true;
    renderVri();
    expect(await screen.findByText("Não foi possível carregar seu índice.")).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });
});
