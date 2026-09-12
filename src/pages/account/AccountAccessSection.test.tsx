import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { CREATE_PASSWORD_SUCCESS_MESSAGE } from "@/lib/auth/createPassword";

const createPasswordForCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/createPassword", () => ({
  createPasswordForCurrentUser,
}));

const { AccountAccessSection } = await import("./AccountAccessSection");

const googleOnly = {
  app_metadata: { providers: ["google"] },
  identities: [{ provider: "google" }],
};

beforeEach(() => {
  createPasswordForCurrentUser.mockReset();
  createPasswordForCurrentUser.mockResolvedValue({ id: "same-user" });
});

describe("AccountAccessSection", () => {
  it("Google-only oferece Definir senha sem afirmar que senha não existe", () => {
    render(<AccountAccessSection user={googleOnly} />);
    expect(screen.getByText(/você usa google para acessar sua conta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /definir senha/i })).toBeInTheDocument();
    expect(screen.queryByText(/não possui senha/i)).not.toBeInTheDocument();
  });

  it("stale provider: metadata google-only permanece honesta", () => {
    render(<AccountAccessSection user={googleOnly} />);
    expect(screen.getByRole("button", { name: /definir senha/i })).toBeInTheDocument();
    expect(screen.queryByText(/você ainda não possui senha/i)).not.toBeInTheDocument();
  });

  it("Apple-only também oferece Definir senha", () => {
    render(
      <AccountAccessSection user={{ app_metadata: { providers: ["apple"] }, identities: [{ provider: "apple" }] }} />,
    );
    expect(screen.getByText(/você usa apple para acessar sua conta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /definir senha/i })).toBeInTheDocument();
  });

  it("providers vazios não oferece definir senha", () => {
    const { container } = render(
      <AccountAccessSection user={{ app_metadata: { providers: [] }, identities: [] }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("email ou google+email mostra Senha configurada", () => {
    const { rerender } = render(
      <AccountAccessSection user={{ app_metadata: { providers: ["email"] }, identities: [{ provider: "email" }] }} />,
    );
    expect(screen.getByText(/senha configurada/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /definir senha/i })).not.toBeInTheDocument();

    rerender(
      <AccountAccessSection
        user={{
          app_metadata: { providers: ["google", "email"] },
          identities: [{ provider: "google" }, { provider: "email" }],
        }}
      />,
    );
    expect(screen.getByText(/senha configurada/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /definir senha/i })).not.toBeInTheDocument();
  });

  it("senha curta e divergente não chamam updateUser", () => {
    render(<AccountAccessSection user={googleOnly} />);
    fireEvent.click(screen.getByRole("button", { name: /definir senha/i }));
    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "abcdefg" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "abcdefg" } });
    fireEvent.submit(screen.getByRole("button", { name: /salvar senha/i }).closest("form")!);
    expect(createPasswordForCurrentUser).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/pelo menos 8/i);

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "abcdefgh" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "abcdefghx" } });
    fireEvent.submit(screen.getByRole("button", { name: /salvar senha/i }).closest("form")!);
    expect(createPasswordForCurrentUser).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/não coincidem/i);
  });

  it("sucesso chama API só com senha e mostra estado da sessão", async () => {
    render(<AccountAccessSection user={googleOnly} />);
    fireEvent.click(screen.getByRole("button", { name: /definir senha/i }));
    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "abcdefgh" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "abcdefgh" } });
    fireEvent.submit(screen.getByRole("button", { name: /salvar senha/i }).closest("form")!);
    expect(createPasswordForCurrentUser).toHaveBeenCalledWith("abcdefgh");
    expect(await screen.findByText(CREATE_PASSWORD_SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/senha configurada/i)).toBeInTheDocument();
  });
});
