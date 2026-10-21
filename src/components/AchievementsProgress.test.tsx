import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AchievementsProgress, { achievementsPercent } from "./AchievementsProgress";

describe("Conquistas › progresso geral (PDF do Ernâni, tela 08)", () => {
  it("calcula a porcentagem arredondada e protegida", () => {
    expect(achievementsPercent(7, 16)).toBe(44);
    expect(achievementsPercent(0, 0)).toBe(0);
    expect(achievementsPercent(20, 16)).toBe(100);
    expect(achievementsPercent(-1, 16)).toBe(0);
  });
  it("mostra '7 de 16 desbloqueadas', 44% e a barra", () => {
    render(<AchievementsProgress unlocked={7} total={16} />);
    expect(screen.getByText("7 de 16 desbloqueadas")).toBeInTheDocument();
    expect(screen.getByText("44%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progresso das conquistas" })).toHaveAttribute("aria-valuenow", "44");
  });
});
