import * as React from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/providers/auth-context";
import { useIdentity } from "@/hooks/useIdentity";
import { useClinicAccessState } from "@/hooks/useClinicAccessState";
import { resolvePatientClinicAccess } from "@/lib/auth/patientClinicAccess";
import { PendingAccessScreen } from "@/pages/PendingAccessScreen";
import { ClinicSuspendedScreen } from "@/pages/ClinicSuspendedScreen";

function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
    </div>
  );
}

/**
 * Guard de rota. FAIL-CLOSED:
 *   loading        → spinner (não pisca o app antes de saber se é pending);
 *   sem sessão     → /login;
 *   'active' + clínica operacional → app;
 *   'active' + clínica suspensa → ClinicSuspendedScreen (não PendingAccess);
 *   QUALQUER outra identidade → PendingAccessScreen. NUNCA o app. Nunca paciente fake.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const identity = useIdentity();
  const askClinic = identity.status === "active";
  const clinicQuery = useClinicAccessState(askClinic);
  const clinicAccess = resolvePatientClinicAccess({
    state: clinicQuery.data
      ? { accessState: clinicQuery.data.accessState, clinicStatus: clinicQuery.data.clinicStatus }
      : undefined,
    isLoading: clinicQuery.isLoading,
    isError: clinicQuery.isError,
  });

  if (authLoading || identity.status === "loading") {
    return <Loading />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (identity.status === "active") {
    if (clinicAccess === "loading") {
      return <Loading />;
    }
    if (clinicAccess === "clinic-suspended") {
      return <ClinicSuspendedScreen />;
    }
    if (clinicAccess === "ok") {
      return <>{children}</>;
    }
    return <ClinicSuspendedScreen />;
  }

  return <PendingAccessScreen />;
}
