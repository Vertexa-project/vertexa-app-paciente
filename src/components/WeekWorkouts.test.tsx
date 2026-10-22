import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WeekWorkouts, { pickTodayWorkout, workoutMeta } from "./WeekWorkouts";
import type { Workout } from "@/data/workoutData";

const w = (id: string, letter: string, dayIndex: number, minutes: number, n = 5): Workout => ({
  id, letter, name: `Nome ${letter}`, muscleGroup: "", dayOfWeek: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dayIndex],
  dayIndex, exercises: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}` })) as never, estimatedMinutes: minutes, estimatedCalories: 0, completed: false,
});
const PLAN = [w("a", "A", 1, 50), w("b", "B", 2, 0), w("e", "E", 5, 50, 1)];

describe("Plano › Treino (PDF do Ernâni, tela 20)", () => {
  it("escolhe o treino do dia; sem treino hoje, o primeiro da ficha", () => {
    expect(pickTodayWorkout(PLAN, 5)).toEqual({ workout: PLAN[2], isToday: true });
    expect(pickTodayWorkout(PLAN, 0)).toEqual({ workout: PLAN[0], isToday: false });
    expect(pickTodayWorkout([], 1)).toBeNull();
  });
  it("nunca escreve '0 min' e usa o singular", () => {
    expect(workoutMeta(PLAN[1])).toBe("5 exercícios");
    expect(workoutMeta(PLAN[2])).toBe("1 exercício · ~50 min");
    expect(workoutMeta(PLAN[0])).toBe("5 exercícios · ~50 min");
  });
  it("mostra o treino de hoje, a ficha da semana e abre o treino", () => {
    const onOpen = vi.fn();
    render(<WeekWorkouts plan={PLAN} dow={5} onOpen={onOpen} />);
    expect(screen.getByText(/Treino de hoje · Sex/)).toBeInTheDocument();
    expect(screen.getByText("Treino E · Nome E")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Ficha da semana" })).toBeInTheDocument();
    expect(screen.getAllByText("hoje")).toHaveLength(1);
    screen.getByRole("button", { name: /Abrir treino/ }).click();
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it("sem treino hoje não marca 'hoje' em nenhum", () => {
    render(<WeekWorkouts plan={PLAN} dow={0} onOpen={() => {}} />);
    expect(screen.getByText("Próximo treino")).toBeInTheDocument();
    expect(screen.queryByText("hoje")).toBeNull();
  });
  it("marca 'feito' só nos treinos concluídos na semana e conta 'X de Y feitos'", () => {
    render(<WeekWorkouts plan={PLAN} dow={5} onOpen={() => {}} doneIds={new Set(["a", "e"])} />);
    expect(screen.getAllByText("✓ feito")).toHaveLength(2);
    expect(screen.getByTestId("week-done-count")).toHaveTextContent("2 de 3 feitos");
    expect(screen.queryByText("hoje")).toBeNull(); // o de hoje (E) já foi feito: o selo "feito" vence
  });
  it("sem leitura de conclusões (doneIds ausente): sem contador nem 'feito'", () => {
    render(<WeekWorkouts plan={PLAN} dow={5} onOpen={() => {}} />);
    expect(screen.queryByTestId("week-done-count")).toBeNull();
    expect(screen.queryByText("✓ feito")).toBeNull();
  });

  it("tocar em qualquer treino da ficha abre ESSE treino (não só o de hoje)", () => {
    const onOpen = vi.fn();
    render(<WeekWorkouts plan={PLAN} dow={5} onOpen={onOpen} />);
    screen.getByTestId("week-a").click();
    expect(onOpen).toHaveBeenLastCalledWith("a");
    screen.getByRole("button", { name: /Abrir treino/ }).click();
    expect(onOpen).toHaveBeenLastCalledWith("e");
  });
});
