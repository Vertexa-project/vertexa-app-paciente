import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ workouts: [] as unknown[] }));
vi.mock("@/lib/api", () => ({ getMyWorkoutPlan: vi.fn(async () => api.workouts) }));
vi.mock("@/lib/eventTracker", () => ({ tracker: { track: vi.fn() } }));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/components/ExerciseThumb", () => ({ default: () => null }));
vi.mock("@/components/EffortPicker", () => ({ default: () => null }));
vi.mock("@/components/EducatorNote", () => ({ default: () => null }));

const { default: WorkoutGuide } = await import("./WorkoutGuide");

const set = () => ({ reps: 10, weight: 0, completed: false });
const exercise = (id: string, name: string) => ({ id, name, muscleGroups: ["Peito"], sets: [set(), set(), set()], restSeconds: 60, gifUrl: "" });
const workout = (exercises: unknown[], minutes: number, kcal: number) => ({
  id: "w2", letter: "B", name: "Peito", muscleGroup: "", dayOfWeek: "Ter", dayIndex: 2, exercises, estimatedMinutes: minutes, estimatedCalories: kcal, completed: false,
});

async function openWorkout(w: unknown) {
  api.workouts = [w];
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WorkoutGuide />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByTestId("workout-w2"));
}

beforeEach(() => { api.workouts = []; });

describe("Treino aberto no app", () => {
  it("1 exercício: mostra 1 exercício e o tempo estimado; nada de 0 Min / 0 kcal nem '5 exercícios' (a preparação diz 'movimentos de preparação')", async () => {
    await openWorkout(workout([exercise("e1", "Supino reto")], 5, 30));
    expect(await screen.findByTestId("detail-exercises")).toHaveTextContent("1 exercício");
    expect(screen.getByTestId("detail-minutes")).toHaveTextContent("~5 min");
    expect(screen.getByTestId("detail-kcal")).toHaveTextContent("~30 kcal");
    expect(document.body.textContent).not.toMatch(/\b0 Min|\b0 kcal/);
    expect(screen.queryByText(/5 exercícios/)).toBeNull();
    expect(screen.getByText(/movimentos de preparação/)).toBeInTheDocument();
  });
  it("sem dado de tempo e de calorias, esconde em vez de mostrar zero", async () => {
    await openWorkout(workout([exercise("e1", "Supino reto")], 0, 0));
    await screen.findByTestId("detail-exercises");
    expect(screen.queryByTestId("detail-minutes")).toBeNull();
    expect(screen.queryByTestId("detail-kcal")).toBeNull();
  });
  it("tocar na linha do exercício abre o exercício (mesmo destino do 'Pular para o treino', posicionado nele)", async () => {
    await openWorkout(workout([exercise("e1", "Supino reto"), exercise("e2", "Crucifixo")], 10, 60));
    fireEvent.click(await screen.findByTestId("open-exercise-1"));
    expect(await screen.findByRole("heading", { name: "Crucifixo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Supino reto" })).toBeNull();
  });
  it("'Pular para o treino' segue abrindo no primeiro exercício", async () => {
    await openWorkout(workout([exercise("e1", "Supino reto"), exercise("e2", "Crucifixo")], 10, 60));
    fireEvent.click(await screen.findByRole("button", { name: /Pular para o treino/ }));
    expect(await screen.findByRole("heading", { name: "Supino reto" })).toBeInTheDocument();
  });
});
