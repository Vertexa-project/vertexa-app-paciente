// Seam for "who is the current patient".
// Today: a fixed demo patient (Mariana) read from .env.
// Later: replace getCurrentPatientProfileId() with the authenticated user's profile id.

const DEMO_PATIENT_PROFILE_ID = import.meta.env.VITE_DEMO_PATIENT_PROFILE_ID;

/** true quando o id do paciente de demo está configurado no .env. */
export const isDemoPatientConfigured = Boolean(DEMO_PATIENT_PROFILE_ID);

if (!isDemoPatientConfigured && import.meta.env.DEV) {
  // Não estoura no carregamento do módulo (evita tela branca no boot, ver main.tsx);
  // apenas sinaliza. As funções de api/ tratam o id ausente retornando vazio/null.
  console.error(
    "[VERTEXA] VITE_DEMO_PATIENT_PROFILE_ID ausente no .env (id do perfil do paciente de demo)."
  );
}

/**
 * Returns the profiles.id of the current patient.
 * Demo mode returns the seeded patient; swap for real auth later. Retorna "" quando ausente
 * (sem throw) — chamadas Supabase com profile_id vazio simplesmente não encontram linha.
 */
export function getCurrentPatientProfileId(): string {
  return DEMO_PATIENT_PROFILE_ID || "";
}
