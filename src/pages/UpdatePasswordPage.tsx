import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import {
  PASSWORD_FORGOT_PATH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_INVALID_MESSAGE,
  classifyAuthUrlError,
  resolveUpdatePasswordView,
  validateNewPassword,
} from "@/lib/auth/passwordRecovery";
import { useAuth } from "@/providers/auth-context";

import { AuthShell } from "./auth/AuthShell";
import { PasswordField } from "./auth/PasswordField";

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isPasswordRecovery, updatePassword, signOut } = useAuth();

  const urlError = classifyAuthUrlError(location.hash, location.search);
  const view = resolveUpdatePasswordView({
    authLoading: loading,
    isPasswordRecovery,
    urlError,
  });

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await updatePassword(password);
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      setError("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (view === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    );
  }

  if (view === "invalid") {
    return (
      <AuthShell title="Link inválido">
        <p className="text-sm text-muted-foreground">{PASSWORD_RESET_INVALID_MESSAGE}</p>
        <button
          type="button"
          onClick={() => navigate(PASSWORD_FORGOT_PATH)}
          className="flex h-14 w-full items-center justify-center rounded-xl text-base font-semibold text-primary-foreground gradient-orange shadow-orange transition-transform active:scale-[0.98]"
        >
          Solicitar novo link
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Redefinir senha">
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <PasswordField
          id="new-password"
          label="Nova senha"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((value) => !value)}
        />
        <p className="-mt-2 text-xs text-muted-foreground">Mínimo de {PASSWORD_MIN_LENGTH} caracteres.</p>
        <PasswordField
          id="confirm-password"
          label="Confirmar nova senha"
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
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-primary-foreground gradient-orange shadow-orange transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Redefinir senha
        </button>
      </form>
    </AuthShell>
  );
}
