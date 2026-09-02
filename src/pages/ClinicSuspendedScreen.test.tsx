import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

const { ClinicSuspendedScreen } = await import("./ClinicSuspendedScreen");

describe("ClinicSuspendedScreen — S30", () => {
  it("explica a indisponibilidade sem motivo administrativo", () => {
    render(
      <MemoryRouter>
        <ClinicSuspendedScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText("Clínica temporariamente indisponível")).toBeInTheDocument();
    expect(screen.getByText(/dados continuam preservados/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    expect(screen.queryByText(/inadimpl/i)).not.toBeInTheDocument();
  });
});
