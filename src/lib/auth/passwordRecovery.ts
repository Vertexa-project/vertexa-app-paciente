/** Rotas auth-special de recuperação e callback único. */
export const PASSWORD_RESET_PATH = "/auth/update-password";
export const PASSWORD_FORGOT_PATH = "/auth/forgot-password";
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Mínimo alinhado ao Auth Dashboard (password_min_length = 8). */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RESET_NOTICE =
  "Se existir uma conta para este e-mail, você receberá as instruções.";

export const PASSWORD_RESET_INVALID_MESSAGE = "Este link de recuperação é inválido ou expirou.";

export const PASSWORD_UPDATED_MESSAGE = "Senha atualizada com sucesso.";

export type AuthUrlErrorKind = "none" | "expired" | "denied";

export type UpdatePasswordView = "loading" | "form" | "invalid";

export type NewPasswordValidation =
  | { ok: true }
  | { ok: false; reason: "mismatch" | "too_short" };

function parseAuthParams(hash?: string | null, search = ""): URLSearchParams {
  const rawHash = hash ?? "";
  const rawSearch = search ?? "";
  const hashBody = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  const searchBody = rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch;
  const params = new URLSearchParams(searchBody);
  const hashParams = new URLSearchParams(hashBody);
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

/** `redirectTo` do recovery: origin atual + rota fixa. Sem domínio hardcoded. */
export function passwordResetRedirectTo(origin: string): string {
  return `${origin.replace(/\/$/, "")}${PASSWORD_RESET_PATH}`;
}

/**
 * Classifica falha de link Auth.
 * NÃO usa `error_description` — só `error` / `error_code`.
 */
export function classifyAuthUrlError(hash: string, search = ""): AuthUrlErrorKind {
  const params = parseAuthParams(hash, search);
  const error = params.get("error");
  const errorCode = params.get("error_code");
  if (!error && !errorCode) return "none";
  if (errorCode === "otp_expired") return "expired";
  if (error || errorCode) return "denied";
  return "none";
}

export function isPasswordRecoveryUrl(hash: string, search = ""): boolean {
  return parseAuthParams(hash, search).get("type") === "recovery";
}

export function resolveUpdatePasswordView(input: {
  authLoading: boolean;
  isPasswordRecovery: boolean;
  urlError: AuthUrlErrorKind;
}): UpdatePasswordView {
  if (input.urlError !== "none") return "invalid";
  if (input.authLoading) return "loading";
  return input.isPasswordRecovery ? "form" : "invalid";
}

export function isValidResetEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateNewPassword(password: string, confirmation: string): NewPasswordValidation {
  if (password !== confirmation) return { ok: false, reason: "mismatch" };
  if (password.length < PASSWORD_MIN_LENGTH) return { ok: false, reason: "too_short" };
  return { ok: true };
}

/** Evento oficial do @supabase/supabase-js v2 para sessão de recovery. */
export function isPasswordRecoveryEvent(event: string): boolean {
  return event === "PASSWORD_RECOVERY";
}
