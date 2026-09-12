import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const state = vi.hoisted(() => ({
  isAuthenticated: false,
  isPasswordRecovery: false,
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => ({
    isAuthenticated: state.isAuthenticated,
    isPasswordRecovery: state.isPasswordRecovery,
    signIn: state.signIn,
    signInWithGoogle: state.signInWithGoogle,
  }),
}));

const { default: Login } = await import("./Login");

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<div data-testid="home" />} />
        <Route path="/auth/forgot-password" element={<div data-testid="forgot-password" />} />
        <Route path="/auth/update-password" element={<div data-testid="update-password" />} />
        <Route path="/auth/activate" element={<div data-testid="activate" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  state.isAuthenticated = false;
  state.isPasswordRecovery = false;
  state.signIn.mockReset();
  state.signInWithGoogle.mockReset();
  state.signIn.mockResolvedValue(undefined);
  state.signInWithGoogle.mockResolvedValue(undefined);
});

describe("Login — AUTH-EMAIL-03", () => {
  it("mostra e-mail, senha, Entrar, Esqueci e Continuar com Google", () => {
    renderLogin();
    expect(screen.getByLabelText(/^e-mail$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^entrar$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /esqueci minha senha/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar com google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ativar minha conta/i })).toBeInTheDocument();
    expect(screen.queryByText(/criar cadastro de paciente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/modo demonstração/i)).not.toBeInTheDocument();
  });

  it("já autenticado vai para /home", () => {
    state.isAuthenticated = true;
    renderLogin();
    expect(screen.getByTestId("home")).toBeInTheDocument();
  });

  it("recovery session vai para update-password, não /home", () => {
    state.isAuthenticated = true;
    state.isPasswordRecovery = true;
    renderLogin();
    expect(screen.getByTestId("update-password")).toBeInTheDocument();
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });

  it("e-mail e senha corretos chamam signIn e vão a /home", async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/^e-mail$/i), { target: { value: "ana@paciente.com" } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "abcdefgh" } });
    fireEvent.click(screen.getByRole("button", { name: /^entrar$/i }));
    await waitFor(() => expect(state.signIn).toHaveBeenCalledTimes(1));
    expect(state.signIn).toHaveBeenCalledWith("ana@paciente.com", "abcdefgh");
    expect(await screen.findByTestId("home")).toBeInTheDocument();
  });

  it("credencial inválida mostra erro seguro, sem enumerar", async () => {
    state.signIn.mockRejectedValue({ message: "Invalid login credentials", status: 400 });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/^e-mail$/i), { target: { value: "ana@paciente.com" } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "erradaaaa" } });
    fireEvent.click(screen.getByRole("button", { name: /^entrar$/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/e-mail ou senha inválidos/i);
    expect(alert.textContent?.toLowerCase()).not.toContain("google");
    expect(alert.textContent?.toLowerCase()).not.toContain("não existe");
    expect(alert.textContent?.toLowerCase()).not.toContain("confirm");
  });

  it("Ativar minha conta abre /auth/activate", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /ativar minha conta/i }));
    expect(screen.getByTestId("activate")).toBeInTheDocument();
  });

  it("Esqueci minha senha abre forgot-password", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /esqueci minha senha/i }));
    expect(screen.getByTestId("forgot-password")).toBeInTheDocument();
  });

  it("Continuar com Google chama o path OAuth existente", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /continuar com google/i }));
    await waitFor(() => expect(state.signInWithGoogle).toHaveBeenCalledTimes(1));
  });
});
