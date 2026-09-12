import { describe, expect, it } from "vitest";

import { AUTH_CALLBACK_PATH } from "./passwordRecovery";
import {
  ACTIVATION_CHECK_EMAIL_BODY,
  ACTIVATION_CHECK_EMAIL_TITLE,
  AUTH_ACTIVATE_PATH,
  activationEmailRedirectTo,
  buildActivationRequest,
  validateActivationForm,
} from "./activation";

describe("AUTH-EMAIL-03 — rotas de ativação", () => {
  it("rota dedicada é /auth/activate", () => {
    expect(AUTH_ACTIVATE_PATH).toBe("/auth/activate");
  });

  it("emailRedirectTo termina em /auth/callback", () => {
    expect(activationEmailRedirectTo("http://localhost:8080")).toBe("http://localhost:8080/auth/callback");
    expect(activationEmailRedirectTo("https://paciente.vertexa.app.br").endsWith(AUTH_CALLBACK_PATH)).toBe(
      true,
    );
  });
});

describe("validateActivationForm", () => {
  const valid = {
    fullName: "Ana Costa",
    email: "ana@paciente.com",
    password: "abcdefgh",
    confirmation: "abcdefgh",
  };

  it("aceita senha de 8 caracteres sem complexidade extra", () => {
    expect(validateActivationForm(valid)).toEqual({
      ok: true,
      fullName: "Ana Costa",
      email: "ana@paciente.com",
      password: "abcdefgh",
    });
  });

  it("rejeita senha com 7 caracteres", () => {
    const result = validateActivationForm({ ...valid, password: "abcdefg", confirmation: "abcdefg" });
    expect(result).toEqual({
      ok: false,
      field: "password",
      message: "A senha deve ter pelo menos 8 caracteres.",
    });
  });

  it("rejeita senhas divergentes", () => {
    expect(validateActivationForm({ ...valid, confirmation: "abcdefghx" })).toEqual({
      ok: false,
      field: "confirmation",
      message: "As senhas não coincidem.",
    });
  });
});

describe("buildActivationRequest — sem autoridade", () => {
  it("envia só full_name e signup_surface=patient_app", () => {
    const request = buildActivationRequest({
      email: " ana@paciente.com ",
      password: "abcdefgh",
      fullName: " Ana Costa ",
      origin: "http://localhost:8080",
    });

    expect(request.email).toBe("ana@paciente.com");
    expect(request.options.emailRedirectTo).toBe("http://localhost:8080/auth/callback");
    expect(request.options.data).toEqual({
      full_name: "Ana Costa",
      signup_surface: "patient_app",
    });
    expect(Object.keys(request.options.data).sort()).toEqual(["full_name", "signup_surface"]);
    expect(request.options.data).not.toHaveProperty("role");
    expect(request.options.data).not.toHaveProperty("patient_id");
    expect(request.options.data).not.toHaveProperty("profile_id");
    expect(request.options.data).not.toHaveProperty("clinic_id");
    expect(request.options.data).not.toHaveProperty("professional_id");
    expect(request.options.data).not.toHaveProperty("is_admin");
    expect(JSON.stringify(request.options.data)).not.toMatch(/admin|patient_id|clinic_id/i);
  });
});

describe("anti-enumeration copy de ativação", () => {
  it("sucesso é Confira seu e-mail, sem afirmar vínculo", () => {
    expect(ACTIVATION_CHECK_EMAIL_TITLE).toBe("Confira seu e-mail");
    expect(ACTIVATION_CHECK_EMAIL_BODY.toLowerCase()).not.toContain("encontramos");
    expect(ACTIVATION_CHECK_EMAIL_BODY.toLowerCase()).not.toContain("já cadastrado");
    expect(ACTIVATION_CHECK_EMAIL_BODY.toLowerCase()).not.toContain("google");
    expect(ACTIVATION_CHECK_EMAIL_BODY.toLowerCase()).not.toContain("paciente encontrado");
  });
});
