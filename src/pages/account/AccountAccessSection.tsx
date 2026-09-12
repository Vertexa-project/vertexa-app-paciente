import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { createPasswordForCurrentUser } from "@/lib/api/createPassword";
import {
  oauthPasswordSetupCopy,
  resolvePasswordSetupUX,
  type AuthIdentityUser,
} from "@/lib/auth/authIdentities";
import { classifyCreatePasswordError, CREATE_PASSWORD_SUCCESS_MESSAGE } from "@/lib/auth/createPassword";
import { PASSWORD_MIN_LENGTH, validateNewPassword } from "@/lib/auth/passwordRecovery";
import { PasswordField } from "@/pages/auth/PasswordField";

export function AccountAccessSection({ user }: { user: AuthIdentityUser }) {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setupUX = useMemo(() => resolvePasswordSetupUX(user), [user]);
  const canDefine = setupUX === "can_define_password";
  const configured = setupUX === "reported_password_configured" || success;

  if (!canDefine && !configured) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const check = validateNewPassword(password, confirmation);
    if (check.ok === false) {
      setError(
        check.reason === "mismatch"
          ? "As senhas não coincidem."
          : `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createPasswordForCurrentUser(password);
      setSuccess(true);
      setEditing(false);
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(classifyCreatePasswordError(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
      <h2 className="text-sm font-semibold text-foreground">Segurança da conta</h2>
      {configured ? (
        <p className="mt-1 text-sm text-muted-foreground">Senha configurada</p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{oauthPasswordSetupCopy(user)}</p>
      )}

      {success ? (
        <p className="mt-2 text-sm text-foreground" role="status">
          {CREATE_PASSWORD_SUCCESS_MESSAGE}
        </p>
      ) : null}

      {configured ? null : editing ? (
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-3">
          <PasswordField
            id="create-password"
            label="Nova senha"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            visible={showPassword}
            onToggleVisible={() => setShowPassword((value) => !value)}
          />
          <p className="-mt-1 text-xs text-muted-foreground">Mínimo de {PASSWORD_MIN_LENGTH} caracteres.</p>
          <PasswordField
            id="create-password-confirm"
            label="Confirmar senha"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
            visible={showConfirmation}
            onToggleVisible={() => setShowConfirmation((value) => !value)}
            hideToggleLabel="Ocultar confirmação de senha"
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground gradient-orange disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Salvar senha
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold text-foreground"
        >
          Definir senha
        </button>
      )}
    </div>
  );
}
