import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import FloatingChatButton from "./FloatingChatButton";

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname}|{JSON.stringify(l.state)}</p>;
}
const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><FloatingChatButton /><Routes><Route path="*" element={<Where />} /></Routes></MemoryRouter>);

describe("Botão flutuante 'Minha equipe' (PDF do Ernâni, telas 01 e 26)", () => {
  it("aparece nas telas do paciente, incluindo VRI e resumo da semana", () => {
    for (const p of ["/home", "/vri", "/weekly-summary", "/plan"]) {
      const { container, unmount } = renderAt(p);
      expect(container.querySelector("button")).not.toBeNull();
      unmount();
    }
  });
  it("não aparece no chat nem no login", () => {
    for (const p of ["/team-chat", "/login"]) {
      const { container, unmount } = renderAt(p);
      expect(container.querySelector("button")).toBeNull();
      unmount();
    }
  });
  it("não mostra contagem de não lidas inventada", () => {
    renderAt("/home");
    expect(screen.queryByText("2")).toBeNull();
  });
  it("abre o chat com o destino da aba: Plano → nutricionista, Treino → educador, resto → ninguém", () => {
    const cases: [string, string | null][] = [["/plan", "nutricionista"], ["/workout-guide", "educador_fisico"], ["/home", null]];
    for (const [path, expected] of cases) {
      const { container, unmount } = renderAt(path);
      fireEvent.click(container.querySelector("button")!);
      expect(screen.getByTestId("where")).toHaveTextContent(`/team-chat|${JSON.stringify({ toDiscipline: expected })}`);
      unmount();
    }
  });
});
