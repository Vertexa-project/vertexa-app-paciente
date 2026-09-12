import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { requestPasswordReset as requestPasswordResetApi, updatePassword as updatePasswordApi } from "@/lib/api/authPassword";
import { ensureMyProfile } from "@/lib/api/ensureMyProfile";
import { isPasswordRecoveryEvent, isPasswordRecoveryUrl } from "@/lib/auth/passwordRecovery";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { captureException } from "@/lib/observability/sentry";
import { AuthContext } from "./auth-context";

/**
 * Provider de sessão. Só a sessão Supabase autentica.
 * Após sessão (exceto recovery/refresh), espera `ensure_my_profile()` antes de liberar
 * a identidade — evita RequireAuth decidir "pending" cedo demais.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    let bootstrapped = false;

    function markRecoveryFromUrl() {
      if (typeof window === "undefined") return;
      if (isPasswordRecoveryUrl(window.location.hash ?? "", window.location.search ?? "")) {
        setIsPasswordRecovery(true);
      }
    }

    async function attachAuthenticatedSession(next: Session | null, endLoading: boolean) {
      if (next) {
        try {
          await ensureMyProfile();
        } catch {
          // Fail-closed: identidade cai em pending se o profile/patient ainda não existir.
        }
      }
      if (!active) return;
      setSession(next);
      if (endLoading) setLoading(false);
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!active || bootstrapped) return;
      bootstrapped = true;
      markRecoveryFromUrl();
      void attachAuthenticatedSession(data.session, true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (isPasswordRecoveryEvent(event)) setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") setIsPasswordRecovery(false);

      if (event === "INITIAL_SESSION") {
        if (bootstrapped) return;
        bootstrapped = true;
        markRecoveryFromUrl();
        void attachAuthenticatedSession(next, true);
        return;
      }

      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(next);
        return;
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
        return;
      }

      if (event === "PASSWORD_RECOVERY") {
        setSession(next);
        return;
      }

      if (event === "SIGNED_IN") {
        setLoading(true);
        void attachAuthenticatedSession(next, true);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
    queryClient.clear();
  }, []);

  const requestPasswordReset = useCallback((email: string) => requestPasswordResetApi(email), []);
  const updatePassword = useCallback((password: string) => updatePasswordApi(password), []);

  const value = useMemo(
    () => ({
      session,
      loading,
      isAuthenticated: Boolean(session),
      isPasswordRecovery,
      signIn,
      signInWithGoogle,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [
      session,
      loading,
      isPasswordRecovery,
      signIn,
      signInWithGoogle,
      signOut,
      requestPasswordReset,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
