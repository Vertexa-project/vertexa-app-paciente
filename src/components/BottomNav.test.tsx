import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import BottomNav from "./BottomNav";

describe("BottomNav (PDF do Ernâni: Hoje · Jornada · Evolução · Plano · Perfil)", () => {
  it("mostra as cinco abas com os nomes do design", () => {
    render(<MemoryRouter><BottomNav /></MemoryRouter>);
    for (const t of ["Hoje", "Jornada", "Evolução", "Plano", "Perfil"]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(screen.queryByText("Home")).toBeNull();
    expect(screen.queryByText("Progresso")).toBeNull();
  });
});
