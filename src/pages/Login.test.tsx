import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    signInWithGoogle: vi.fn(),
  }),
}));

const { default: Login } = await import("./Login");

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login — só autenticação Google real (WP-04B)", () => {
  it("mostra Entrar com Google", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /entrar com google/i })).toBeInTheDocument();
  });

  it("não há botão 'Esqueci minha senha'", () => {
    renderLogin();
    expect(screen.queryByText(/esqueci minha senha/i)).not.toBeInTheDocument();
  });

  it("nenhuma variante de recuperar/redefinir senha na tela", () => {
    renderLogin();
    expect(screen.queryByText(/(recuperar|redefinir|esqueci).*senha/i)).not.toBeInTheDocument();
  });

  it("não oferece modo demonstração nem entrada mock sem OAuth", () => {
    renderLogin();
    expect(screen.queryByText(/modo demonstração/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^entrar$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^apple$/i)).not.toBeInTheDocument();
  });
});
