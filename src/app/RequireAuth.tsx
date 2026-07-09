import * as React from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { isDemoAuth } from "@/lib/auth/authMode";
import { useAuth } from "@/providers/auth-context";
import { useIdentity } from "@/hooks/useIdentity";
import { PendingAccessScreen } from "@/pages/PendingAccessScreen";

/**
 * Guard de rota. Chamado nos DOIS modos (hooks sempre no topo → rules-of-hooks ok), mas só
 * ATUA no modo real:
 *   - demo: PASS-THROUGH — app IDÊNTICO a hoje (nenhum gate novo; identidade = pin).
 *   - real (FAIL-CLOSED):
 *       loading            → spinner (não pisca o app antes de saber se é 'pending');
 *       sem sessão         → /login;
 *       'active'           → renderiza o app;
 *       QUALQUER outra     → PendingAccessScreen (pending/anonymous/não resolvido). NUNCA o app.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const identity = useIdentity();

  if (isDemoAuth) return <>{children}</>;

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

  // FAIL-CLOSED: sessão real com identidade não resolvida (pending/qualquer outra) → nunca o app.
  return <PendingAccessScreen />;
}
