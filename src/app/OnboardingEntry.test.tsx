import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const authState = vi.hoisted(() => ({
  loading: false,
  isAuthenticated: false,
}));

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => authState,
}));

const { OnboardingEntry } = await import("./OnboardingEntry");

function entryRoutes() {
  return (
    <MemoryRouter initialEntries={["/onboarding"]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingEntry />} />
        <Route path="/home" element={<div data-testid="require-auth-boundary">home</div>} />
        <Route path="/login" element={<div data-testid="login">login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authState.loading = false;
  authState.isAuthenticated = false;
});

describe("OnboardingEntry", () => {
  it("espera a hidratação e não exibe onboarding nem redireciona prematuramente", () => {
    authState.loading = true;
    render(entryRoutes());

    expect(screen.getByLabelText("Carregando sessão")).toBeInTheDocument();
    expect(screen.queryByTestId("require-auth-boundary")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login")).not.toBeInTheDocument();
  });

  it("envia uma sessão autenticada ao RequireAuth em /home", () => {
    authState.isAuthenticated = true;
    render(entryRoutes());

    expect(screen.getByTestId("require-auth-boundary")).toBeInTheDocument();
  });

  it("decide por /home quando a sessão se resolve após a primeira renderização", () => {
    authState.loading = true;
    const view = render(entryRoutes());
    expect(screen.getByLabelText("Carregando sessão")).toBeInTheDocument();

    authState.loading = false;
    authState.isAuthenticated = true;
    view.rerender(entryRoutes());

    expect(screen.getByTestId("require-auth-boundary")).toBeInTheDocument();
  });

  it("envia visitante sem sessão, após hidratação, ao login", () => {
    render(entryRoutes());

    expect(screen.getByTestId("login")).toBeInTheDocument();
  });

  it("não decide vínculo de paciente: toda sessão segue para o limite RequireAuth", () => {
    authState.isAuthenticated = true;
    render(entryRoutes());

    expect(screen.getByTestId("require-auth-boundary")).toBeInTheDocument();
    expect(screen.queryByTestId("login")).not.toBeInTheDocument();
  });

});
