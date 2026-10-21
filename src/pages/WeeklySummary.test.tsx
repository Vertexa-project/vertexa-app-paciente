import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WeeklySummary as S } from "@/lib/weeklySummary";

const hook = vi.hoisted(() => ({ state: { summary: null as unknown, isLoading: false, isError: false, refetch: vi.fn() } }));
vi.mock("@/hooks/useWeeklySummary", () => ({ useWeeklySummary: () => hook.state }));
vi.mock("@/lib/api", () => ({ getMyClinicBrand: vi.fn(async () => null) }));

const { default: WeeklySummary } = await import("./WeeklySummary");

const SUMMARY: S = {
  rangeStart: "2026-10-19", rangeEnd: "2026-10-25", isClosed: false,
  kcalByDay: [480, 420, 510, 0, 0, 0, 0], kcalTotal: 1410, kcalAvgPerDay: 470, kcalVsPrevPct: 8,
  workoutsDone: 3, workoutsPlanned: 5, streak: 9, vriDelta: 6, score: 84, mealsPct: 86,
};

const renderIt = () => render(<MemoryRouter><WeeklySummary /></MemoryRouter>);
beforeEach(() => { hook.state = { summary: SUMMARY, isLoading: false, isError: false, refetch: vi.fn() }; });

describe("Resumo da semana (PDF do Ernâni, tela 17)", () => {
  it("mostra total, variação, média e o período", () => {
    renderIt();
    const kcal = screen.getByTestId("weekly-kcal");
    expect(kcal).toHaveTextContent("1.410");
    expect(kcal).toHaveTextContent("+8% vs. semana anterior");
    expect(screen.getByText(/19 a 25 out · em andamento/)).toBeInTheDocument();
    expect(screen.getByText("470")).toBeInTheDocument();
  });
  it("os 4 cards: treinos, sequência, VRI e refeições", () => {
    renderIt();
    const c = screen.getByTestId("weekly-cards");
    expect(c).toHaveTextContent("3/5");
    expect(c).toHaveTextContent("9 dias");
    expect(c).toHaveTextContent("VRI +6");
    expect(c).toHaveTextContent("84 pontos");
    expect(c).toHaveTextContent("86%");
  });
  it("sem base de comparação: sem selo de variação", () => {
    hook.state.summary = { ...SUMMARY, kcalVsPrevPct: null };
    renderIt();
    expect(screen.queryByText(/vs. semana anterior/)).not.toBeInTheDocument();
  });
  it("queda mostra seta para baixo, sem '+'", () => {
    hook.state.summary = { ...SUMMARY, kcalVsPrevPct: -12 };
    renderIt();
    expect(screen.getByText("↓ -12% vs. semana anterior")).toBeInTheDocument();
  });
  it("sem ficha e sem plano: não inventa 0/0 nem 0%", () => {
    hook.state.summary = { ...SUMMARY, workoutsPlanned: 0, mealsPct: null, vriDelta: null };
    renderIt();
    const c = screen.getByTestId("weekly-cards");
    expect(c).toHaveTextContent("dias com treino");
    expect(c).toHaveTextContent("sem plano alimentar");
    expect(c).not.toHaveTextContent("VRI +");
  });
  it("carregando e erro têm estados próprios", () => {
    hook.state = { summary: null, isLoading: true, isError: false, refetch: vi.fn() };
    const { unmount } = renderIt();
    expect(screen.queryByTestId("weekly-kcal")).not.toBeInTheDocument();
    unmount();
    hook.state = { summary: null, isLoading: false, isError: true, refetch: vi.fn() };
    renderIt();
    expect(screen.getByText("Não foi possível carregar o resumo da semana.")).toBeInTheDocument();
  });
  it("avisa que é estimativa, não gasto medido", () => {
    renderIt();
    expect(screen.getByText(/Não é gasto medido/)).toBeInTheDocument();
  });
});
