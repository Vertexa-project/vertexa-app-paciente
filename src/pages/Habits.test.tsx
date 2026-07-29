import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({
  logHydration: vi.fn(async () => undefined),
  getHydrationTodayLiters: vi.fn(async () => 0),
}));

const { default: Habits } = await import("./Habits");

function renderHabits() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** O destaque do humor escolhido É a classe `gradient-orange` — é o sinal que a paciente vê. */
function isSelected(label: string): boolean {
  const button = screen.getByText(label).closest("button");
  return !!button?.className.includes("gradient-orange");
}

describe("Hábitos / humor inicial (WP-APP-4 item 6)", () => {
  // Antes: useState(habitTracking.mood) => "bem". A tela abria com "Bem" aceso, idêntico a um
  // registro que ela tivesse acabado de fazer — e nada por trás: nenhum mood_logged era lido.
  it("abre sem nenhum humor escolhido", () => {
    renderHabits();
    for (const label of ["Ótimo", "Bem", "Neutro", "Mal"]) {
      expect(isSelected(label)).toBe(false);
    }
  });

  it("só acende depois que ela escolhe — e só o que ela escolheu", () => {
    renderHabits();
    fireEvent.click(screen.getByText("Ótimo"));

    expect(isSelected("Ótimo")).toBe(true);
    expect(isSelected("Bem")).toBe(false);
  });
});
