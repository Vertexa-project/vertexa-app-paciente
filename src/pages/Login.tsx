import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AUTH_RATE_LIMIT_MESSAGE,
  LOGIN_INVALID_CREDENTIALS_MESSAGE,
  isAuthRateLimitedError,
} from "@/lib/auth/authClientErrors";
import { AUTH_ACTIVATE_PATH } from "@/lib/auth/activation";
import { PASSWORD_FORGOT_PATH } from "@/lib/auth/passwordRecovery";
import { useAuth } from "@/providers/auth-context";
import logoWordmark from "@/assets/logo/logo_2.png";

import { PasswordField } from "./auth/PasswordField";

/** Logo "G" do Google (inline, sem asset externo). */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/**
 * Login e-mail/senha + Google. Sem cadastro clínico aberto.
 * Sessão recovery vai para update-password; sessão normal para /home (RequireAuth decide pending).
 */
export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isPasswordRecovery, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPasswordRecovery) {
    return <Navigate to="/auth/update-password" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/home", { replace: true });
    } catch (cause) {
      setError(isAuthRateLimitedError(cause) ? AUTH_RATE_LIMIT_MESSAGE : LOGIN_INVALID_CREDENTIALS_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("Não foi possível iniciar o login com Google. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background px-8 pt-16 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex min-h-full w-full max-w-sm flex-col">
        <div className="mb-2 flex items-center">
          <img src={logoWordmark} alt="VERTEXA" className="h-8 w-auto select-none" draggable={false} />
        </div>
        <p className="mb-8 text-sm text-muted-foreground">Entre para acessar seu acompanhamento</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <PasswordField
            id="login-password"
            label="Senha"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            visible={showPassword}
            onToggleVisible={() => setShowPassword((value) => !value)}
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
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-3 text-center">
          <button
            type="button"
            onClick={() => navigate(PASSWORD_FORGOT_PATH)}
            className="rounded text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Esqueci minha senha
          </button>
        </p>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={submitting}
          className="flex h-14 items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-base font-semibold text-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <GoogleGlyph />}
          Continuar com Google
        </button>

        <div className="mt-8 pb-4 text-center">
          <p className="text-sm text-muted-foreground">Ainda não ativou seu acesso?</p>
          <button
            type="button"
            onClick={() => navigate(AUTH_ACTIVATE_PATH)}
            className="mt-2 rounded text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ativar minha conta
          </button>
        </div>
      </motion.div>
    </div>
  );
}
