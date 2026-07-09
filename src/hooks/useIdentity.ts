import { useQuery } from "@tanstack/react-query";

import { AUTH_MODE, isRealAuth } from "@/lib/auth/authMode";
import { resolvePatientIdentity, type ResolvedPatientIdentity } from "@/lib/auth/identity";
import { getPatientByAuthUserId } from "@/lib/api/patient";
import { DEMO_PATIENT_PROFILE_ID, setActivePatientProfileId } from "@/lib/currentPatient";
import { captureException } from "@/lib/observability/sentry";
import { useAuth } from "@/providers/auth-context";

/**
 * Fonte ÚNICA da identidade do paciente atuante (real OU demo). Orquestra as buscas e delega a
 * decisão à função pura `resolvePatientIdentity`.
 *
 * - demo: identidade = pin de env (comportamento de hoje). Nenhuma query dispara.
 * - real: auth.uid() → getPatientByAuthUserId → patient. Sessão sem patient = pending.
 *
 * Efeito colateral (modo real): empurra o profile resolvido para o seam SÍNCRONO
 * `currentPatient` para que os consumidores de api/ resolvam o paciente autenticado sem tocar
 * em cada call site. Falhas de resolução vão ao Sentry com source:"auth" (sem PII).
 */
export function useIdentity(): ResolvedPatientIdentity {
  const { session, loading: authLoading } = useAuth();

  const authUserId = isRealAuth ? session?.user.id ?? null : null;

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
    enabled: isRealAuth && Boolean(authUserId),
    staleTime: Infinity,
  });

  const loading =
    authLoading || (isRealAuth && Boolean(authUserId) && patientQuery.isLoading);

  const resolved = resolvePatientIdentity({
    mode: AUTH_MODE,
    loading,
    demoProfileId: DEMO_PATIENT_PROFILE_ID,
    session:
      isRealAuth && session
        ? { userId: session.user.id, email: session.user.email ?? null }
        : null,
    patient: patientQuery.data ?? null,
  });

  // Bridge (só modo real): sincroniza o seam SÍNCRONO `currentPatient` com o profile resolvido
  // DURANTE o render (não em efeito). `useIdentity` só é chamado pelo `RequireAuth` (pai das
  // rotas protegidas), então isto roda ANTES de as telas protegidas — e suas queries — montarem
  // no MESMO commit. Um efeito do pai rodaria DEPOIS dos efeitos/fetch do filho (tarde demais):
  // `getMyPatientId` leria o holder vazio e o react-query cachearia null sob `staleTime:Infinity`
  // (chave estática `['myPatientId']`), quebrando notificações/conquistas/jornada/mapa a sessão
  // inteira. A escrita é idempotente e determinística (mesmo valor a cada render).
  if (isRealAuth) setActivePatientProfileId(resolved.patientProfileId);

  return resolved;
}
