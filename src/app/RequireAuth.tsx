import * as React from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/providers/auth-context";
import { useIdentity } from "@/hooks/useIdentity";
import { PendingAccessScreen } from "@/pages/PendingAccessScreen";

/**
 * Guard de rota. FAIL-CLOSED:
 *   loading        → spinner (não pisca o app antes de saber se é pending);
 *   sem sessão     → /login;
 *   'active'       → renderiza o app;
 *   QUALQUER outra → PendingAccessScreen. NUNCA o app. Nunca paciente fake.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const identity = useIdentity();

  if (authLoading || identity.status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (identity.status === "active") {
    return <>{children}</>;
  }

  return <PendingAccessScreen />;
}
