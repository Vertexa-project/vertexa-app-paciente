import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_RATE_LIMIT_MESSAGE } from "@/lib/auth/authClientErrors";
import { isValidResetEmail, PASSWORD_RESET_NOTICE } from "@/lib/auth/passwordRecovery";
import { useAuth } from "@/providers/auth-context";

import { AuthShell } from "./auth/AuthShell";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidResetEmail(email) || submitting) return;
    setSubmitting(true);
    setRateLimited(false);
    try {
      const result = await requestPasswordReset(email);
      if (result.kind === "rate_limited") {
        setRateLimited(true);
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Recuperar senha">
      <p className="text-sm text-muted-foreground">
        Informe o e-mail da sua conta. Se ela existir, enviaremos as instruções.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="reset-email">E-mail</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        {rateLimited ? (
          <p className="text-sm text-destructive" role="alert">
            {AUTH_RATE_LIMIT_MESSAGE}
          </p>
        ) : null}
        {sent ? (
          <p className="text-sm text-muted-foreground" role="status">
            {PASSWORD_RESET_NOTICE}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-primary-foreground gradient-orange shadow-orange transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Enviar
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Voltar ao login
        </Link>
      </p>
    </AuthShell>
  );
}
