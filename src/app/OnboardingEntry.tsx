import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/providers/auth-context";

/**
 * Session-aware entry reached after Splash.  It waits for the existing
 * Supabase session bootstrap before making a route decision.  Authorization
 * and patient/clinic binding remain exclusively in RequireAuth at /home.
 */
export function OnboardingEntry() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando sessão" />
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/home" : "/login"} replace />;
}
