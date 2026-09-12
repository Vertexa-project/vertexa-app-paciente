import { describe, expect, it } from "vitest";

import {
  AUTH_CALLBACK_PATH,
  PASSWORD_FORGOT_PATH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_NOTICE,
  PASSWORD_RESET_PATH,
  classifyAuthUrlError,
  isPasswordRecoveryEvent,
  passwordResetRedirectTo,
  resolveUpdatePasswordView,
  validateNewPassword,
} from "./passwordRecovery";

describe("passwordResetRedirectTo", () => {
  it("termina em /auth/update-password no origin atual", () => {
    expect(passwordResetRedirectTo("http://localhost:8080")).toBe(
      "http://localhost:8080/auth/update-password",
    );
    expect(passwordResetRedirectTo("https://paciente.vertexa.app.br/").endsWith(PASSWORD_RESET_PATH)).toBe(
      true,
    );
  });
});

describe("validateNewPassword", () => {
  it("abaixo de 8 não passa", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(validateNewPassword("abcdefg", "abcdefg")).toEqual({ ok: false, reason: "too_short" });
  });

  it("senhas divergentes não passam", () => {
    expect(validateNewPassword("abcdefgh", "abcdefghx")).toEqual({ ok: false, reason: "mismatch" });
  });

  it("iguais e com 8 caracteres passam sem complexidade extra", () => {
    expect(validateNewPassword("abcdefgh", "abcdefgh")).toEqual({ ok: true });
  });
});

describe("anti-enumeration copy", () => {
  it("forgot-password é genérico", () => {
    expect(PASSWORD_RESET_NOTICE.toLowerCase()).toContain("se existir uma conta");
    expect(PASSWORD_RESET_NOTICE.toLowerCase()).not.toContain("não encontramos");
    expect(PASSWORD_RESET_NOTICE.toLowerCase()).not.toContain("google");
  });

  it("rotas auth-special são estáveis", () => {
    expect(PASSWORD_RESET_PATH).toBe("/auth/update-password");
    expect(PASSWORD_FORGOT_PATH).toBe("/auth/forgot-password");
    expect(AUTH_CALLBACK_PATH).toBe("/auth/callback");
  });
});

describe("classifyAuthUrlError", () => {
  it("otp_expired é expirado", () => {
    expect(classifyAuthUrlError("#error=access_denied&error_code=otp_expired")).toBe("expired");
  });
});

describe("resolveUpdatePasswordView", () => {
  it("sem recovery e sem erro de URL → inválido", () => {
    expect(
      resolveUpdatePasswordView({ authLoading: false, isPasswordRecovery: false, urlError: "none" }),
    ).toBe("invalid");
  });

  it("recovery válido → formulário", () => {
    expect(
      resolveUpdatePasswordView({ authLoading: false, isPasswordRecovery: true, urlError: "none" }),
    ).toBe("form");
  });
});

describe("isPasswordRecoveryEvent", () => {
  it("só PASSWORD_RECOVERY liga o fluxo", () => {
    expect(isPasswordRecoveryEvent("PASSWORD_RECOVERY")).toBe(true);
    expect(isPasswordRecoveryEvent("SIGNED_IN")).toBe(false);
  });
});
