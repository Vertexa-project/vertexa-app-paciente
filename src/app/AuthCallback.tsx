import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

import { isPasswordRecoveryEvent, PASSWORD_RESET_PATH } from "@/lib/auth/passwordRecovery";
import { captureException } from "@/lib/observability/sentry";
import { supabase } from "@/lib/supabase";

/**
 * Retorno único de Auth: OAuth Google e confirmação de e-mail.
 * O client (detectSessionInUrl = default true) troca `?code=` por sessão; daí /home.
 * AuthProvider chama ensure_my_profile() ao receber a sessão — sem callback paralelo.
 * Recovery (`PASSWORD_RECOVERY`) vai para /auth/update-password. Sem PII no Sentry.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let recovery = false;

    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error_description") || params.get("error");
    if (providerError) {
      captureException(new Error(`OAuth callback error: ${params.get("error") ?? "unknown"}`), {
        source: "auth",
        scope: "callback",
      });
      setFailed(true);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (isPasswordRecoveryEvent(event)) {
        recovery = true;
        navigate(PASSWORD_RESET_PATH, { replace: true });
        return;
      }
      if (next && !recovery) navigate("/home", { replace: true });
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || recovery) return;
      if (error) {
        captureException(error, { source: "auth", scope: "callback" });
        setFailed(true);
        return;
      }
      navigate(data.session ? "/home" : "/login", { replace: true });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

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
