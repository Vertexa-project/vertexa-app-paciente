/**
 * Seam síncrono: "quem é o paciente atuante" (profiles.id).
 * Só a camada de identidade (`useIdentity`) grava, a partir de auth.uid().
 * Sem sessão resolvida o holder fica "" — as APIs não encontram linha (fail-closed).
 * Não há pin de env nem paciente default.
 */

let activePatientProfileId = "";

/**
 * Chamado por `useIdentity` quando o profile da sessão resolve (ou limpa no logout).
 */
export function setActivePatientProfileId(profileId: string | null): void {
  activePatientProfileId = profileId || "";
}

/** profiles.id do paciente autenticado, ou "" se ainda não resolvido. Sem throw. */
export function getCurrentPatientProfileId(): string {
  return activePatientProfileId;
}
