import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { isRealAuth } from "@/lib/auth/authMode";
import { captureException } from "@/lib/observability/sentry";
import { AuthContext } from "./auth-context";

/**
 * Provider de sessão do app paciente. Montado nos DOIS modos (a forma do contexto fica estável);
 * no modo demo a sessão real é null e nada gera gate — o app é IDÊNTICO a hoje.
 *
 * Login é Google-first (DÍVIDA-AUTH-3): só `signInWithGoogle` (sem e-mail/senha). Erros de auth
 * vão ao Sentry com source:"auth" SEM PII (só a razão do provedor; nunca email/nome/uid).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Marca a superfície de signup (DIAGNÓSTICO no trigger; NUNCA concede privilégio).
        // Nota: nesta versão do supabase-js o OAuth não tem options.data → usamos queryParams
        // (melhor esforço). Ver INTEGRACAO.md (DÍVIDA-AUTH: superfície é telemetria, não segurança).
        queryParams: { signup_surface: "patient_app" },
      },
    });
    if (error) {
      captureException(error, { source: "auth", scope: "oauth-start" });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Descarta o cache de dados da sessão anterior (ex.: ['myPatientId']) — evita servir dados do
    // usuário anterior num próximo login na mesma aba (chaves estáticas + staleTime:Infinity).
    queryClient.clear();
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      // Real: só a sessão real autentica. Demo: sempre acessível (o gate real é inerte).
      isAuthenticated: isRealAuth ? Boolean(session) : true,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
