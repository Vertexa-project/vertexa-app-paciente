import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WorkoutList from "./WorkoutList";
import type { Workout } from "@/data/workoutData";

const w = (id: string, letter: string, day: string): Workout => ({
  id, letter, name: `Nome ${letter}`, muscleGroup: "", dayOfWeek: day, dayIndex: 1, exercises: [{}, {}] as never, estimatedMinutes: 40, estimatedCalories: 200, completed: false,
});
const PLAN = [w("a", "A", "Seg"), w("b", "B", "Ter"), w("c", "C", "Qua")];

describe("Lista de treinos — qualquer treino da semana pode ser feito", () => {
  it("o treino de hoje E os outros abrem ao tocar", () => {
    const onOpen = vi.fn();
    render(<WorkoutList schedule={PLAN} todayId="b" onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId("workout-b"));
    fireEvent.click(screen.getByTestId("workout-a"));
    fireEvent.click(screen.getByTestId("workout-c"));
    expect(onOpen.mock.calls.map((c) => (c[0] as Workout).id)).toEqual(["b", "a", "c"]);
  });
  it("os outros dias não ficam esmaecidos nem bloqueados; só o de hoje tem destaque", () => {
    render(<WorkoutList schedule={PLAN} todayId="b" onOpen={vi.fn()} />);
    expect(screen.getByTestId("workout-a").className).not.toMatch(/opacity-50/);
    expect(screen.getByTestId("workout-a").className).not.toMatch(/border-primary/);
    expect(screen.getByTestId("workout-b").className).toMatch(/border-primary/);
    expect(screen.getByText("Programado para Seg")).toBeInTheDocument();
    expect(screen.queryByText("Programado para Ter")).toBeNull();
  });
  it("o aviso diz que dá para escolher qualquer treino", () => {
    render(<WorkoutList schedule={PLAN} todayId="b" onOpen={vi.fn()} />);
    expect(screen.getByText(/qualquer treino da semana/)).toBeInTheDocument();
  });
});
