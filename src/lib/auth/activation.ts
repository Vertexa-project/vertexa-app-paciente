import { isValidResetEmail, PASSWORD_MIN_LENGTH, validateNewPassword } from "./passwordRecovery";

export const AUTH_ACTIVATE_PATH = "/auth/activate";

export const ACTIVATION_CHECK_EMAIL_TITLE = "Confira seu e-mail";

export const ACTIVATION_CHECK_EMAIL_BODY =
  "Se este e-mail puder receber mensagens, enviamos um link para confirmar seu acesso. Depois de confirmar, você poderá entrar.";

export type ActivationField = "fullName" | "email" | "password" | "confirmation";

export type ActivationValidation =
  | { ok: true; fullName: string; email: string; password: string }
  | { ok: false; field: ActivationField; message: string };

export function activationEmailRedirectTo(origin: string): string {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

export function validateActivationForm(input: {
  fullName: string;
  email: string;
  password: string;
  confirmation: string;
}): ActivationValidation {
  const fullName = input.fullName.trim();
  if (fullName.length === 0) {
    return { ok: false, field: "fullName", message: "Informe seu nome completo." };
  }

  const email = input.email.trim();
  if (!isValidResetEmail(email)) {
    return { ok: false, field: "email", message: "Informe um e-mail válido." };
  }

  const passwordCheck = validateNewPassword(input.password, input.confirmation);
  if (passwordCheck.ok === false) {
    if (passwordCheck.reason === "mismatch") {
      return { ok: false, field: "confirmation", message: "As senhas não coincidem." };
    }
    return {
      ok: false,
      field: "password",
      message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }

  return { ok: true, fullName, email, password: input.password };
}

/** Payload único do signUp de ativação — sem role, patient, clínica ou flags de autoridade. */
export function buildActivationRequest(input: {
  email: string;
  password: string;
  fullName: string;
  origin: string;
}): {
  email: string;
  password: string;
  options: {
    emailRedirectTo: string;
    data: { full_name: string; signup_surface: "patient_app" };
  };
} {
  return {
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: activationEmailRedirectTo(input.origin),
      data: {
        full_name: input.fullName.trim(),
        signup_surface: "patient_app",
      },
    },
  };
}
