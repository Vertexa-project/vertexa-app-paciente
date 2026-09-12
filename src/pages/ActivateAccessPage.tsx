import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activateAccess } from "@/lib/api/authSignup";
import { ACTIVATION_GENERIC_ERROR_MESSAGE, AUTH_RATE_LIMIT_MESSAGE } from "@/lib/auth/authClientErrors";
import {
  ACTIVATION_CHECK_EMAIL_BODY,
  ACTIVATION_CHECK_EMAIL_TITLE,
  validateActivationForm,
  type ActivationField,
} from "@/lib/auth/activation";

import { AuthShell } from "./auth/AuthShell";
import { PasswordField } from "./auth/PasswordField";

const FIELD_IDS: Record<ActivationField, string> = {
  fullName: "activate-full-name",
  email: "activate-email",
  password: "activate-password",
  confirmation: "activate-confirmation",
};

export function ActivateAccessPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const submittingRef = useRef(false);

  function focusField(field: ActivationField) {
    document.getElementById(FIELD_IDS[field])?.focus();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || checkEmail) return;

    const check = validateActivationForm({ fullName, email, password, confirmation });
    if (check.ok === false) {
      setError(check.message);
      focusField(check.field);
      return;
    }

    setError(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await activateAccess({
        email: check.email,
        password: check.password,
        fullName: check.fullName,
      });
      if (result.kind === "rate_limited") {
        setError(AUTH_RATE_LIMIT_MESSAGE);
        return;
      }
      if (result.kind === "failed") {
        setError(ACTIVATION_GENERIC_ERROR_MESSAGE);
        return;
      }
      setCheckEmail(true);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell title={ACTIVATION_CHECK_EMAIL_TITLE}>
        <p className="text-sm text-muted-foreground">{ACTIVATION_CHECK_EMAIL_BODY}</p>
        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Voltar ao login
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Ative seu acesso ao Vertexa">
      <p className="text-sm text-muted-foreground">
        Seu acesso será liberado quando este e-mail estiver vinculado a um cadastro feito pela sua
        clínica/profissional.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor={FIELD_IDS.fullName}>Nome completo</Label>
          <Input
            id={FIELD_IDS.fullName}
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-12 rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={FIELD_IDS.email}>E-mail</Label>
          <Input
            id={FIELD_IDS.email}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-xl"
            required
          />
        </div>

        <PasswordField
          id={FIELD_IDS.password}
          label="Senha"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((value) => !value)}
        />
        <p className="-mt-2 text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>

        <PasswordField
          id={FIELD_IDS.confirmation}
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
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-primary-foreground gradient-orange shadow-orange transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {submitting ? "Ativando…" : "Ativar minha conta"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já ativou?{" "}
        <Link to="/login" className="font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
