import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

const { PendingAccessScreen } = await import("./PendingAccessScreen");

describe("PendingAccessScreen", () => {
  it("é provider-agnostic: não manda entrar com Google", () => {
    render(
      <MemoryRouter>
        <PendingAccessScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /acesso pendente/i })).toBeInTheDocument();
    expect(screen.getByText(/ainda não está vinculada a um cadastro de paciente/i)).toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).not.toContain("entre com google");
    expect(document.body.textContent?.toLowerCase()).not.toContain("entrar com google");
  });
});
