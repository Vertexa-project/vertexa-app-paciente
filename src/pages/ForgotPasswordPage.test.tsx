import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { PASSWORD_RESET_NOTICE } from "@/lib/auth/passwordRecovery";

const auth = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => ({
    requestPasswordReset: auth.requestPasswordReset,
  }),
}));

const { ForgotPasswordPage } = await import("./ForgotPasswordPage");

function renderForgot() {
  return render(
    <MemoryRouter initialEntries={["/auth/forgot-password"]}>
      <Routes>
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div data-testid="login" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.requestPasswordReset.mockReset();
  auth.requestPasswordReset.mockResolvedValue({ kind: "sent" });
});

describe("ForgotPasswordPage", () => {
  it("e-mail inválido não envia", () => {
    renderForgot();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "nao-e-email" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("e-mail válido chama requestPasswordReset e mostra aviso neutro", async () => {
    renderForgot();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "ana@paciente.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));
    expect(auth.requestPasswordReset).toHaveBeenCalledWith("ana@paciente.com");
    expect(await screen.findByRole("status")).toHaveTextContent(PASSWORD_RESET_NOTICE);
  });
});
