import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  workouts: [] as unknown[],
}));

vi.mock("@/lib/api", () => ({
  getMyNutritionPlan: vi.fn(async () => null),
  getMealsDoneToday: vi.fn(async () => new Set<string>()),
  toggleMealDone: vi.fn(),
  getMySupplements: vi.fn(async () => []),
  getSupplementsTakenToday: vi.fn(async () => new Set<string>()),
  toggleSupplementTaken: vi.fn(),
  getMyWorkoutPlan: vi.fn(async () => api.workouts),
}));

const { default: Plan } = await import("./Plan");
const { NO_WORKOUT_PLAN_TITLE } = await import("@/components/NoPrescriptionYet");

const WORKOUT = {
  id: "w1",
  letter: "A",
  name: "Superior",
  dayOfWeek: "Segunda",
  dayIndex: 1,
  estimatedMinutes: 50,
  exercises: [],
};

function renderPlan() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Plan />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.workouts = [];
});

describe("Meu Plano / aba Treino (WP-APP-4 item 6)", () => {
  // O card afirmava "Veja sua ficha completa..." mesmo para quem não tem ficha; a paciente só
  // descobria a ausência depois de tocar e cair no vazio do /workout-guide.
  it("sem ficha publicada: estado vazio, sem card e sem 'Abrir meu treino'", async () => {
    api.workouts = [];
    renderPlan();
    fireEvent.click(screen.getByText("Treino"));

    expect(await screen.findByText(NO_WORKOUT_PLAN_TITLE)).toBeInTheDocument();
    expect(screen.queryByText("Abrir meu treino")).not.toBeInTheDocument();
    expect(screen.queryByText("Guia de Treino Interativo")).not.toBeInTheDocument();
  });

  it("com ficha publicada: o card volta inteiro", async () => {
    api.workouts = [WORKOUT];
    renderPlan();
    fireEvent.click(screen.getByText("Treino"));

    expect(await screen.findByText("Abrir meu treino")).toBeInTheDocument();
    expect(screen.queryByText(NO_WORKOUT_PLAN_TITLE)).not.toBeInTheDocument();
  });
});

describe("Meu Plano / aba de dicas (WP-APP-4 item 4)", () => {
  it("a aba se chama 'Dicas gerais' — a diferença aparece antes de ela abrir", () => {
    renderPlan();
    expect(screen.getByText("Dicas gerais")).toBeInTheDocument();
  });

  it("dentro, o rótulo diz que não é prescrição do profissional dela", async () => {
    renderPlan();
    fireEvent.click(screen.getByText("Dicas gerais"));

    expect(await screen.findByText("Orientações gerais")).toBeInTheDocument();
    expect(screen.getByText(/não substituem a prescrição da sua equipe/i)).toBeInTheDocument();
  });

  it("as quatro orientações continuam lá — o WP rotula, não apaga", async () => {
    renderPlan();
    fireEvent.click(screen.getByText("Dicas gerais"));

    expect(await screen.findByText("Hidratação")).toBeInTheDocument();
    expect(screen.getByText("Sono reparador")).toBeInTheDocument();
    expect(screen.getByText("Alimentação consciente")).toBeInTheDocument();
    expect(screen.getByText("Estresse")).toBeInTheDocument();
  });
});
