import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());
const captureException = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail,
      updateUser,
    },
  },
}));

vi.mock("@/lib/observability/sentry", () => ({
  captureException,
}));

const { requestPasswordReset, updatePassword } = await import("./authPassword");

beforeEach(() => {
  resetPasswordForEmail.mockReset();
  updateUser.mockReset();
  captureException.mockReset();
  resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  updateUser.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPasswordReset", () => {
  it("redirectTo termina em /auth/update-password no origin atual", async () => {
    vi.stubGlobal("location", { origin: "http://localhost:8080" });
    await expect(requestPasswordReset("ana@paciente.com")).resolves.toEqual({ kind: "sent" });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("ana@paciente.com", {
      redirectTo: "http://localhost:8080/auth/update-password",
    });
  });

  it("e-mail inválido não chama o client", async () => {
    await requestPasswordReset("nao-e-email");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("updatePassword", () => {
  it("chama updateUser só com a senha", async () => {
    await updatePassword("abcdefgh");
    expect(updateUser).toHaveBeenCalledWith({ password: "abcdefgh" });
  });
});
