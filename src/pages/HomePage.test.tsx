import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AdherenceState } from "@/lib/adherenceEngine";

const SNAPSHOT: AdherenceState = {
  score: 74,
  level: "moderada",
  status: "em_acompanhamento",
  journeyPhase: "inicio",
  daysSinceLastInteraction: 0,
  streak: 2,
  weeklyCompletionRate: 40,
  riskFactors: [],
  positiveFactors: [],
  contextualMessage: "Bom ritmo.",
  lastScoreChange: 0,
};

vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => SNAPSHOT),
  getPendingSummary: vi.fn(async () => null),
  getHydrationTodayLiters: vi.fn(async () => 0),
  getMyWorkoutPlan: vi.fn(async () => []),
  getRecentWeightLogs: vi.fn(async () => []),
  getMealAdherenceToday: vi.fn(async () => null),
}));

vi.mock("@/hooks/useMe", () => ({
  useMe: () => ({
    me: {
      name: "Mariana", fullName: "Mariana Lopes", avatar: "", goal: "",
      currentWeight: null, startWeight: null, targetWeight: null, startDate: null,
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useUnreadNotificationCount: () => ({ count: 0 }),
}));

const { default: HomePage } = await import("./HomePage");

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Home / barra semanal (WP-APP-4 item 1)", () => {
  // Eram `weeklyProgress.days` (mockData.ts): Seg 90, Ter 85, Qua 70, Qui 75, Sex 60, Sáb/Dom 0.
  // Literais versionados, iguais para toda paciente — e coladas no anel do VRI, que é real.
  it("não há mais caixinhas Seg→Dom no card do VRI", async () => {
    renderHome();
    expect(await screen.findByText("74%")).toBeInTheDocument();

    for (const day of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) {
      expect(screen.queryByText(day)).not.toBeInTheDocument();
    }
  });

  it("nenhum dos scores literais do mock aparece", async () => {
    renderHome();
    await screen.findByText("74%");

    for (const score of ["90", "85", "70", "75", "60"]) {
      expect(screen.queryByText(score)).not.toBeInTheDocument();
    }
  });

  // A remoção é da barra MOCK — o VRI real (snapshot do servidor) continua onde estava.
  it("o VRI real e a sequência continuam de pé", async () => {
    renderHome();
    expect(await screen.findByText("74%")).toBeInTheDocument();
    expect(screen.getByText("2 dias de sequência")).toBeInTheDocument();
  });
});
