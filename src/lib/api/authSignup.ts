import { supabase } from "@/lib/supabase";
import { isAuthRateLimitedError, isNeutralSignupDuplicateError } from "@/lib/auth/authClientErrors";
import { buildActivationRequest } from "@/lib/auth/activation";
import { captureException } from "@/lib/observability/sentry";

export type ActivateAccessInput = {
  email: string;
  password: string;
  fullName: string;
};

export type ActivateAccessResult = { kind: "check_email" } | { kind: "rate_limited" } | { kind: "failed" };

/**
 * Ativa acesso e-mail/senha. Confirm email ON: em geral não há sessão.
 * Duplicata (incluindo conta Google no mesmo e-mail) vira o mesmo estado neutro.
 * Nunca envia role, patient_id, clinic_id ou is_admin.
 * Nunca insere patients/clinics/professionals.
 */
export async function activateAccess(input: ActivateAccessInput): Promise<ActivateAccessResult> {
  const payload = buildActivationRequest({
    ...input,
    origin: window.location.origin,
  });

  const { error } = await supabase.auth.signUp(payload);

  if (!error) return { kind: "check_email" };
  if (isAuthRateLimitedError(error)) return { kind: "rate_limited" };
  if (isNeutralSignupDuplicateError(error)) return { kind: "check_email" };

  captureException(error, { source: "auth", scope: "activation" });
  return { kind: "failed" };
}
