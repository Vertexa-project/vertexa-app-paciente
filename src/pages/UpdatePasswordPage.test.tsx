import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { PASSWORD_RESET_INVALID_MESSAGE } from "@/lib/auth/passwordRecovery";

const auth = vi.hoisted(() => ({
  loading: false,
  isPasswordRecovery: false,
  updatePassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/providers/auth-context", () => ({
  useAuth: () => ({
    loading: auth.loading,
    isPasswordRecovery: auth.isPasswordRecovery,
    updatePassword: auth.updatePassword,
    signOut: auth.signOut,
  }),
}));

const { UpdatePasswordPage } = await import("./UpdatePasswordPage");

function renderUpdate(entry: string | { pathname: string; hash?: string } = "/auth/update-password") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
        <Route path="/login" element={<div data-testid="login" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.loading = false;
  auth.isPasswordRecovery = false;
  auth.updatePassword.mockReset();
  auth.signOut.mockReset();
  auth.updatePassword.mockResolvedValue(undefined);
  auth.signOut.mockResolvedValue(undefined);
});

describe("UpdatePasswordPage", () => {
  it("sem recovery mostra link inválido", () => {
    renderUpdate();
    expect(screen.getByText(PASSWORD_RESET_INVALID_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nova senha$/i)).not.toBeInTheDocument();
  });

  it("link expirado é inválido", () => {
    renderUpdate({
      pathname: "/auth/update-password",
      hash: "#error=access_denied&error_code=otp_expired",
    });
    expect(screen.getByText(PASSWORD_RESET_INVALID_MESSAGE)).toBeInTheDocument();
  });

  it("recovery válido redefine, faz signOut e vai ao login", async () => {
    auth.isPasswordRecovery = true;
    renderUpdate();
    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "newpass88" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "newpass88" } });
    fireEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));
    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith("newpass88"));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("login")).toBeInTheDocument();
  });
});
