import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

import { isRealAuth } from "@/lib/auth/authMode";
import { captureException } from "@/lib/observability/sentry";
import { supabase } from "@/lib/supabase";

/**
 * Rota de retorno do OAuth (Google). O client Supabase (detectSessionInUrl = default true) troca
 * o `?code=` por sessão automaticamente; aqui só confirmamos e redirecionamos para /home. Erros
 * do provedor (`?error=`) e falhas de sessão vão ao Sentry (source:"auth", sem PII).
 *
 * Fora do modo real esta rota não faz sentido → volta para /login.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isRealAuth) return;
    let active = true;

    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error_description") || params.get("error");
    if (providerError) {
      // Não logar o e-mail/estado — só a razão do provedor.
      captureException(new Error(`OAuth callback error: ${params.get("error") ?? "unknown"}`), {
        source: "auth",
        scope: "callback",
      });
      setFailed(true);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        captureException(error, { source: "auth", scope: "callback" });
        setFailed(true);
        return;
      }
      navigate(data.session ? "/home" : "/login", { replace: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next && active) navigate("/home", { replace: true });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!isRealAuth) return <Navigate to="/login" replace />;

  if (failed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-display font-bold text-foreground">
            Não foi possível concluir o login
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Houve um problema ao retornar do provedor. Tente novamente.
          </p>
        </div>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="h-12 px-6 rounded-xl gradient-orange text-primary-foreground font-semibold text-sm shadow-orange active:scale-[0.98] transition-transform"
        >
          Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Concluindo login" />
    </div>
  );
}
