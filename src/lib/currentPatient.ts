// Seam for "who is the current patient".
// - demo (VITE_AUTH_MODE=demo, default): a fixed demo patient (Mariana) read from .env. IDÊNTICO
//   ao de hoje.
// - real (VITE_AUTH_MODE=real): the authenticated patient's profiles.id, resolved from
//   auth.uid() by the identity layer (src/hooks/useIdentity.ts) and pushed here via
//   setActivePatientProfileId(). Este seam SÍNCRONO existe para que os ~20 consumidores de
//   api/ (que chamam getCurrentPatientProfileId()/getMyPatientId()) não precisem mudar.

import { isRealAuth } from "@/lib/auth/authMode";

/** Pin do paciente de DEMO (profiles.id). Consumido só pelo ramo demo do resolver. */
export const DEMO_PATIENT_PROFILE_ID: string | null =
  import.meta.env.VITE_DEMO_PATIENT_PROFILE_ID || null;

/** true quando o id do paciente de demo está configurado no .env. */
export const isDemoPatientConfigured = Boolean(DEMO_PATIENT_PROFILE_ID);

if (!isDemoPatientConfigured && !isRealAuth && import.meta.env.DEV) {
  // Só relevante no modo demo. Não estoura no carregamento do módulo (evita tela branca no
  // boot, ver main.tsx); apenas sinaliza. As funções de api/ tratam o id ausente retornando
  // vazio/null.
  console.error(
    "[VERTEXA] VITE_DEMO_PATIENT_PROFILE_ID ausente no .env (id do perfil do paciente de demo)."
  );
}

// Modo real: profiles.id do paciente atuante, resolvido a partir de auth.uid() pela camada de
// identidade; "" até resolver. O modo demo ignora isto e usa o pin. FAIL-CLOSED: enquanto for
// "", as chamadas Supabase filtram por profile_id vazio e simplesmente não encontram linha.
let activeRealPatientProfileId = "";

/**
 * Chamado pela camada de identidade (useIdentity) quando o profile do paciente da sessão real
 * resolve (ou limpa, no logout). No-op efetivo em modo demo (o pin manda).
 */
export function setActivePatientProfileId(profileId: string | null): void {
  activeRealPatientProfileId = profileId || "";
}

/**
 * Returns the profiles.id of the current patient.
 * Demo: o pin semeado (comportamento de hoje). Real: o profile resolvido por auth.uid() (ou ""
 * quando ainda não resolvido → sem dados, fail-closed). Retorna "" quando ausente (sem throw).
 */
export function getCurrentPatientProfileId(): string {
  if (isRealAuth) return activeRealPatientProfileId;
  return DEMO_PATIENT_PROFILE_ID || "";
}
