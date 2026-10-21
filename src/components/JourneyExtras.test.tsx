import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AchievementsRow, JourneyShortcuts, NextMilestoneCard, pickAchievementTiles } from "./JourneyExtras";

const T = (code: string, unlocked: boolean) => ({ code, title: code, icon: "★", unlocked });

describe("Jornada: marco, atalhos e conquistas (PDF do Ernâni, tela 06)", () => {
  it("próximo marco: dia 9 → 'Dia 30 · Reavaliação com a equipe', 9/30", () => {
    render(<NextMilestoneCard dayNumber={9} />);
    expect(screen.getByText("Dia 30 · Reavaliação com a equipe")).toBeInTheDocument();
    expect(screen.getByText("9/30")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
  });
  it("sem jornada iniciada ou depois do dia 90: não mostra o cartão", () => {
    const a = render(<NextMilestoneCard dayNumber={0} />); expect(a.container).toBeEmptyDOMElement(); a.unmount();
    const b = render(<NextMilestoneCard dayNumber={95} />); expect(b.container).toBeEmptyDOMElement();
  });
  it("atalhos mostram a sequência real, com singular", () => {
    render(<MemoryRouter><JourneyShortcuts streak={1} /></MemoryRouter>);
    expect(screen.getByText("1 dia")).toBeInTheDocument();
    expect(screen.getByText("Desafio")).toBeInTheDocument();
  });
  it("quatro conquistas: desbloqueadas primeiro, depois as travadas", () => {
    const tiles = pickAchievementTiles([T("a", false), T("b", true), T("c", false), T("d", true), T("e", true)]);
    expect(tiles.map((t) => t.code)).toEqual(["b", "d", "e", "a"]);
  });
  it("a linha marca travadas como travadas e não some sem dados só quando vazia", () => {
    const { container } = render(<MemoryRouter><AchievementsRow all={[T("x", true), T("y", false)]} /></MemoryRouter>);
    expect(container.querySelectorAll('[data-state="unlocked"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-state="locked"]')).toHaveLength(1);
    const empty = render(<MemoryRouter><AchievementsRow all={[]} /></MemoryRouter>);
    expect(empty.container).toBeEmptyDOMElement();
  });
});
