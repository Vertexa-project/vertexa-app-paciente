import type { AuthMode } from "@/lib/auth/authMode";

/**
 * Identidade do PACIENTE atuante — resolução PURA (sem I/O), testável isoladamente.
 *
 * Contrato de identidade (ver INTEGRACAO.md / CONTRATO_INTEGRACAO.md, análogo ao web mas
 * resolvendo PATIENTS, não professionals):
 *   real: auth.uid() → profiles.auth_user_id → profiles.id → patients.profile_id → patient.
 *   demo: pin de env (VITE_DEMO_PATIENT_PROFILE_ID).
 *
 * Estados:
 *   loading    — ainda resolvendo (sessão/patient).
 *   anonymous  — modo real sem sessão.
 *   demo       — modo demo (identidade via pin; ignora sessão real).
 *   active     — modo real com um `patients` ligado ao profile do uid.
 *   pending    — modo real com sessão mas SEM patient (1º login sem match por e-mail → trigger
 *                criou profile 'pending' sem patients). O app mostra PendingAccessScreen.
 *
 * FAIL-CLOSED: sessão real sem patient resolvido NUNCA vira 'active' — vira 'pending'.
 */
export type PatientIdentityStatus = "loading" | "anonymous" | "demo" | "active" | "pending";

/** Registro do paciente resolvido a partir do auth_user_id (real). */
export interface PatientRecord {
  /** profiles.id — o "profile do paciente atuante" (o que os consumidores de api/ usam). */
  profileId: string;
  /** patients.id. */
  patientId: string;
  /** Nome de exibição (profiles.full_name). */
  displayName: string | null;
}

export interface ResolvedPatientIdentity {
  status: PatientIdentityStatus;
  /** profiles.id atuante (real: via auth_user_id; demo: pin). Usado pelos consumidores de api/. */
  patientProfileId: string | null;
  /** patients.id (só resolvido em 'active'). */
  patientId: string | null;
  /** Nome para exibição (patient.displayName → email). */
  displayName: string | null;
  /** E-mail da sessão real (só quando real). null em demo/anon. */
  email: string | null;
}

export interface ResolvePatientIdentityInput {
  mode: AuthMode;
  /** true enquanto sessão/patient ainda estão carregando. */
  loading: boolean;
  /** Pin de demo (VITE_DEMO_PATIENT_PROFILE_ID). */
  demoProfileId: string | null;
  /** Sessão real (só quando mode="real" e há sessão). */
  session: { userId: string; email: string | null } | null;
  /** Registro do paciente resolvido a partir do auth_user_id (real). null → sem patient. */
  patient: PatientRecord | null;
}

/**
 * Deriva a identidade a partir das peças já buscadas. PURA — não toca Supabase/react-query.
 * Em modo real, o pin de demo é IGNORADO por completo (segurança: o pin nunca concede acesso
 * real).
 */
export function resolvePatientIdentity(input: ResolvePatientIdentityInput): ResolvedPatientIdentity {
  const { mode, loading, demoProfileId, session, patient } = input;

  if (loading) {
    return { status: "loading", patientProfileId: null, patientId: null, displayName: null, email: null };
  }

  if (mode === "demo") {
    // Comportamento de hoje: identidade = pin. Ignora qualquer sessão real.
    return {
      status: "demo",
      patientProfileId: demoProfileId,
      patientId: null,
      displayName: null,
      email: null,
    };
  }

  // mode === "real" — o pin de demo é IGNORADO daqui pra baixo.
  if (!session) {
    return { status: "anonymous", patientProfileId: null, patientId: null, displayName: null, email: null };
  }

  if (patient) {
    return {
      status: "active",
      patientProfileId: patient.profileId,
      patientId: patient.patientId,
      displayName: patient.displayName ?? session.email,
      email: session.email,
    };
  }

  // Sessão real, mas sem patient ligado ao profile do uid → acesso pendente (FAIL-CLOSED).
  return {
    status: "pending",
    patientProfileId: null,
    patientId: null,
    displayName: session.email,
    email: session.email,
  };
}
