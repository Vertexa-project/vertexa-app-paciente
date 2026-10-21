import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  workouts: [] as unknown[],
  supplements: [] as unknown[],
  intakes: [] as unknown[],
  completions: [] as unknown[],
  nutrition: null as unknown,
}));

vi.mock("@/lib/api", () => ({
  getMyNutritionPlan: vi.fn(async () => api.nutrition),
  getMealsDoneToday: vi.fn(async () => new Set<string>()),
  toggleMealDone: vi.fn(),
  getMySupplements: vi.fn(async () => api.supplements),
  getSupplementsTakenToday: vi.fn(async () => new Set<string>()),
  getSupplementIntakesWeek: vi.fn(async () => api.intakes),
  getWorkoutCompletionsSince: vi.fn(async () => api.completions),
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
  api.supplements = [];
  api.intakes = [];
  api.completions = [];
  api.nutrition = null;
});

describe("Meu Plano / aba Treino (WP-APP-4 item 6)", () => {
  // O card afirmava "Veja sua ficha completa..." mesmo para quem não tem ficha; a paciente só
  // descobria a ausência depois de tocar e cair no vazio do /workout-guide.
  it("sem ficha publicada: estado vazio, sem card e sem 'Abrir meu treino'", async () => {
    api.workouts = [];
    renderPlan();
    fireEvent.click(screen.getByText("Treino"));

    expect(await screen.findByText(NO_WORKOUT_PLAN_TITLE)).toBeInTheDocument();
    expect(screen.queryByText("Abrir treino")).not.toBeInTheDocument();
    expect(screen.queryByText("Guia de Treino Interativo")).not.toBeInTheDocument();
  });

  it("com ficha publicada: o card volta inteiro", async () => {
    api.workouts = [WORKOUT];
    renderPlan();
    fireEvent.click(screen.getByText("Treino"));

    expect(await screen.findByText("Abrir treino")).toBeInTheDocument();
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

describe("Meu Plano / aba Suplementos — semana (PDF do Ernâni, tela 24)", () => {
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const SUP = { id: "s1", patient_id: "p", name: "Creatina", dose: "6 g", time_label: "Manhã", order_index: 0, kind: "supplement", brand: null, notes: null, reminder_time: null, created_at: new Date(2026, 0, 1).toISOString() };

  it("mostra a adesão da semana e a linha dos 7 dias", async () => {
    api.supplements = [SUP];
    const today = new Date(); const y = new Date(); y.setDate(y.getDate() - 1);
    api.intakes = [{ supplement_id: "s1", taken_on: ymd(today) }, { supplement_id: "s1", taken_on: ymd(y) }];
    renderPlan();
    fireEvent.click(screen.getByText("Suplem."));
    expect(await screen.findByText("Adesão da semana")).toBeInTheDocument();
    expect(await screen.findByText("2/7")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Semana de Creatina" })).toBeInTheDocument();
  });

  it("sem suplementos: nada de adesão", async () => {
    renderPlan();
    fireEvent.click(screen.getByText("Suplem."));
    expect(await screen.findByText(/Nenhum suplemento ou medicamento/)).toBeInTheDocument();
    expect(screen.queryByText("Adesão da semana")).not.toBeInTheDocument();
  });
});

describe("Meu Plano / Treino — 'feito' na semana (PDF do Ernâni, tela 20)", () => {
  it("o treino concluído na semana aparece como feito, com o contador", async () => {
    api.workouts = [WORKOUT];
    api.completions = [{ created_at: new Date().toISOString(), workoutId: (WORKOUT as { id: string }).id }];
    renderPlan();
    fireEvent.click(screen.getByText("Treino"));
    expect(await screen.findByText("✓ feito")).toBeInTheDocument();
    expect(screen.getByTestId("week-done-count")).toHaveTextContent("1 de 1 feitos");
  });
  it("conclusão de outro treino não marca este", async () => {
    api.workouts = [WORKOUT];
    api.completions = [{ created_at: new Date().toISOString(), workoutId: "outro" }];
    renderPlan();
    fireEvent.click(screen.getByText("Treino"));
    expect(await screen.findByTestId("week-done-count")).toHaveTextContent("0 de 1 feitos");
    expect(screen.queryByText("✓ feito")).not.toBeInTheDocument();
  });
});

describe("Meu Plano / Alimentar — sem botão morto (tela 19 do PDF do Ernâni depende de dado novo)", () => {
  it("não mostra 'Ver opções' enquanto o plano não tiver alternativas cadastradas", async () => {
    api.nutrition = { title: "Plano", status: "active", meals: [{ id: "m1", time: "09:00", name: "Café da manhã", items: ["Ovos 2"], calories: 325, done: false }] };
    renderPlan();
    expect(await screen.findByText("Café da manhã")).toBeInTheDocument();
    expect(screen.getByText("325 kcal")).toBeInTheDocument();
    expect(screen.queryByText("Ver opções")).not.toBeInTheDocument();
  });
});
