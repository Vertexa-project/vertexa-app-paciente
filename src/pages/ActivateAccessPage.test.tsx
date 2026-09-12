import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ACTIVATION_CHECK_EMAIL_TITLE } from "@/lib/auth/activation";

const activateAccess = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/authSignup", () => ({
  activateAccess,
}));

const { ActivateAccessPage } = await import("./ActivateAccessPage");

function renderActivate() {
  return render(
    <MemoryRouter initialEntries={["/auth/activate"]}>
      <Routes>
        <Route path="/auth/activate" element={<ActivateAccessPage />} />
        <Route path="/login" element={<div data-testid="login" />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillValid() {
  fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "Ana Costa" } });
  fireEvent.change(screen.getByLabelText(/^e-mail$/i), { target: { value: "ana@paciente.com" } });
  fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "abcdefgh" } });
  fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "abcdefgh" } });
}

beforeEach(() => {
  activateAccess.mockReset();
  activateAccess.mockResolvedValue({ kind: "check_email" });
});

describe("ActivateAccessPage", () => {
  it("mostra copy de ativação, não de cadastro clínico", () => {
    renderActivate();
    expect(screen.getByRole("heading", { name: /ative seu acesso ao vertexa/i })).toBeInTheDocument();
    expect(screen.getByText(/vinculado a um cadastro feito pela sua clínica/i)).toBeInTheDocument();
    expect(screen.queryByText(/cadastre-se como paciente/i)).not.toBeInTheDocument();
    expect(screen.getByText(/mínimo de 8 caracteres/i)).toBeInTheDocument();
  });

  it("senha curta não chama a API", () => {
    renderActivate();
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "Ana Costa" } });
    fireEvent.change(screen.getByLabelText(/^e-mail$/i), { target: { value: "ana@paciente.com" } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "abcdefg" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "abcdefg" } });
    fireEvent.click(screen.getByRole("button", { name: /ativar minha conta/i }));
    expect(activateAccess).not.toHaveBeenCalled();
    expect(screen.getByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();
  });

  it("sucesso mostra Confira seu e-mail sem enumerar", async () => {
    renderActivate();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /ativar minha conta/i }));
    await waitFor(() => expect(activateAccess).toHaveBeenCalledTimes(1));
    expect(activateAccess).toHaveBeenCalledWith({
      email: "ana@paciente.com",
      password: "abcdefgh",
      fullName: "Ana Costa",
    });
    expect(screen.getByRole("heading", { name: ACTIVATION_CHECK_EMAIL_TITLE })).toBeInTheDocument();
    expect(screen.queryByText(/encontramos/i)).not.toBeInTheDocument();
  });
});
