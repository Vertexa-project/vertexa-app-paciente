import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EffortPicker from "./EffortPicker";

describe("Esforço percebido (PDF do Ernâni, tela 23)", () => {
  it("mostra 1 a 10 e devolve o valor escolhido", () => {
    const onPick = vi.fn();
    render(<EffortPicker onPick={onPick} />);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    fireEvent.click(screen.getByRole("radio", { name: "Esforço 7" }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith(7);
    expect(screen.getByText("Anotado: 7 de 10. Obrigado!")).toBeInTheDocument();
  });
  it("uma resposta só por treino: tocar de novo não grava outra", () => {
    const onPick = vi.fn();
    render(<EffortPicker onPick={onPick} />);
    fireEvent.click(screen.getByRole("radio", { name: "Esforço 3" }));
    fireEvent.click(screen.getByRole("radio", { name: "Esforço 9" }));
    fireEvent.click(screen.getByRole("radio", { name: "Esforço 3" }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: "Esforço 3" })).toHaveAttribute("aria-checked", "true");
  });
});
