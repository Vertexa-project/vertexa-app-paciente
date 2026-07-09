import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { tracker } from "@/lib/eventTracker";
import { isRealAuth } from "@/lib/auth/authMode";
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
 * Entrada em MODO REAL (VITE_AUTH_MODE=real): Google-first (DÍVIDA-AUTH-3). Só "Entrar com
 * Google" — sem e-mail/senha e sem Apple —, coerente com o contrato de associação (só o provider
 * Google associa/verifica o e-mail). Se já autenticado, vai direto pro app.
 */
function RealLogin() {
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
      await signInWithGoogle(); // redireciona ao Google (não retorna aqui em caso de sucesso)
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

/**
 * Entrada em MODO DEMO (default): IDÊNTICA à de hoje — "Entrar"/Google/Apple apenas navegam para
 * /home (mock, sem auth real). Os dados vêm do pin de demo (Mariana).
 */
function DemoLogin() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    tracker.track('login_completed', { method: 'email' });
    navigate("/home");
  };

  const socialLogin = (provider: string) => {
    tracker.track('login_completed', { method: provider });
    navigate("/home");
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col px-8 pt-16 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
        <div className="flex items-center mb-2">
          <img src={logoWordmark} alt="VERTEXA" className="h-8 w-auto select-none" draggable={false} />
        </div>
        <p className="text-muted-foreground text-sm mb-10">Entre para acessar seu acompanhamento</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
              className="h-12 rounded-xl bg-card border border-border px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full h-12 rounded-xl bg-card border border-border px-4 pr-12 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="button" className="text-primary text-xs font-medium self-end -mt-1">Esqueci minha senha</button>

          <button type="submit" className="h-14 rounded-xl gradient-orange text-primary-foreground font-semibold text-base shadow-orange active:scale-[0.98] transition-transform mt-4">
            Entrar
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou continue com</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => socialLogin('google')} className="flex-1 h-12 rounded-xl bg-card border border-border flex items-center justify-center gap-2 text-foreground text-sm font-medium active:scale-[0.98] transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
            <button type="button" onClick={() => socialLogin('apple')} className="flex-1 h-12 rounded-xl bg-card border border-border flex items-center justify-center gap-2 text-foreground text-sm font-medium active:scale-[0.98] transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </button>
          </div>

          <div className="mt-auto pt-6 text-center">
            <button type="button" className="text-muted-foreground text-sm">
              Primeiro acesso? <span className="text-primary font-medium">Criar conta</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * Entrada do app. Google-first no modo real; mock IDÊNTICO ao de hoje no modo demo (default).
 * O branch é por constante de módulo (AUTH_MODE) → estável em todos os renders.
 */
export default function Login() {
  return isRealAuth ? <RealLogin /> : <DemoLogin />;
}
