import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-context";
import logoWordmark from "@/assets/logo/logo_2.png";

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
 * Entrada Google-first (DÍVIDA-AUTH-3). Só "Entrar com Google" — sem e-mail/senha, sem Apple,
 * sem modo demonstração. Se já autenticado, vai direto pro app.
 */
export default function Login() {
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
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
    <div className="fixed inset-0 bg-background flex flex-col px-8 pt-16 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
        <div className="flex items-center mb-2">
          <img src={logoWordmark} alt="VERTEXA" className="h-8 w-auto select-none" draggable={false} />
        </div>
        <p className="text-muted-foreground text-sm mb-10">Entre para acessar seu acompanhamento</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="h-14 rounded-xl bg-card border border-border flex items-center justify-center gap-2.5 text-foreground text-base font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
          {submitting ? "Abrindo o Google…" : "Entrar com Google"}
        </button>

        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-auto pt-6 text-center">
          <p className="text-muted-foreground text-xs max-w-xs mx-auto">
            Primeiro acesso? Peça à sua clínica para te cadastrar com o mesmo e-mail do seu Google.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
