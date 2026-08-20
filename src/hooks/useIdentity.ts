import { useQuery } from "@tanstack/react-query";

import { resolvePatientIdentity, type ResolvedPatientIdentity } from "@/lib/auth/identity";
import { getPatientByAuthUserId } from "@/lib/api/patient";
import { setActivePatientProfileId } from "@/lib/currentPatient";
import { captureException } from "@/lib/observability/sentry";
import { useAuth } from "@/providers/auth-context";

/**
 * Fonte única da identidade do paciente atuante.
 * auth.uid() → getPatientByAuthUserId → patient. Sessão sem patient = pending.
 *
 * Efeito colateral: empurra o profile resolvido para o seam síncrono `currentPatient`
 * DURANTE o render (não em efeito), para as queries das telas protegidas lerem o id no
 * mesmo commit. Sem sessão, grava null — nunca um UUID fixo.
 */
export function useIdentity(): ResolvedPatientIdentity {
  const { session, loading: authLoading } = useAuth();
  const authUserId = session?.user.id ?? null;

  const patientQuery = useQuery({
    queryKey: ["identity", "patientByAuthUser", authUserId ?? "none"],
    queryFn: async () => {
      try {
        return await getPatientByAuthUserId(authUserId as string);
      } catch (err) {
        captureException(err, { source: "auth", scope: "resolve-patient" });
        throw err;
      }
    },
    enabled: Boolean(authUserId),
    staleTime: Infinity,
  });

  const loading = authLoading || (Boolean(authUserId) && patientQuery.isLoading);

  const resolved = resolvePatientIdentity({
    loading,
    session: session ? { userId: session.user.id, email: session.user.email ?? null } : null,
    patient: patientQuery.data ?? null,
  });

  setActivePatientProfileId(resolved.patientProfileId);

  return resolved;
}
