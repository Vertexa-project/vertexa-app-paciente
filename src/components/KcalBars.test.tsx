import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KcalBars from "./KcalBars";

describe("barras de kcal (PDF do Ernâni, telas 13 e 17)", () => {
  it("a barra mais alta é a do maior dia; dia sem dado é mínima e apagada", () => {
    render(<KcalBars values={[480, 0, 510, 0, 0, 0, 0]} todayIndex={2} />);
    const h = (i: number) => parseInt((screen.getByTestId(`kcal-bar-${i}`) as HTMLElement).style.height);
    expect(h(2)).toBeGreaterThan(h(0));
    expect(h(1)).toBe(6);
    expect(screen.getByTestId("kcal-bar-1")).toHaveAttribute("data-empty", "true");
    expect(screen.getByTestId("kcal-bar-0")).toHaveAttribute("data-empty", "false");
  });
  it("descreve os valores para leitor de tela", () => {
    render(<KcalBars values={[10, 0, 0, 0, 0, 0, 5]} todayIndex={0} />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("SEG 10"));
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("DOM 5"));
  });
  it("tudo zero não quebra (sem divisão por zero)", () => {
    render(<KcalBars values={[0, 0, 0, 0, 0, 0, 0]} todayIndex={0} />);
    expect(screen.getAllByTestId(/kcal-bar-/)).toHaveLength(7);
  });
});
