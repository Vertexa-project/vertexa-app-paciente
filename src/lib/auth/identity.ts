/**
 * Identidade do PACIENTE atuante — resolução PURA (sem I/O), testável isoladamente.
 *
 * Cadeia: auth.uid() → profiles.auth_user_id → profiles.id → patients.profile_id → patient.
 *
 * Estados:
 *   loading    — ainda resolvendo (sessão/patient).
 *   anonymous  — sem sessão.
 *   active     — `patients` ligado ao profile do uid.
 *   pending    — sessão sem patient (1º login → profile pending). PendingAccessScreen.
 *
 * FAIL-CLOSED: sessão sem patient NUNCA vira 'active'. Sem sessão, nenhum profile/paciente.
 */
export type PatientIdentityStatus = "loading" | "anonymous" | "active" | "pending";

/** Registro do paciente resolvido a partir do auth_user_id. */
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
  /** profiles.id atuante (via auth_user_id). */
  patientProfileId: string | null;
  /** patients.id (só resolvido em 'active'). */
  patientId: string | null;
  /** Nome para exibição (patient.displayName → email). */
  displayName: string | null;
  /** E-mail da sessão. null sem sessão. */
  email: string | null;
}

export interface ResolvePatientIdentityInput {
  /** true enquanto sessão/patient ainda estão carregando. */
  loading: boolean;
  session: { userId: string; email: string | null } | null;
  /** Registro do paciente resolvido a partir do auth_user_id. null → sem patient. */
  patient: PatientRecord | null;
}

/**
 * Deriva a identidade a partir das peças já buscadas. PURA — não toca Supabase/react-query.
 * Sem sessão não há paciente. UUID fixo de env nunca entra aqui.
 */
export function resolvePatientIdentity(input: ResolvePatientIdentityInput): ResolvedPatientIdentity {
  const { loading, session, patient } = input;

  if (loading) {
    return { status: "loading", patientProfileId: null, patientId: null, displayName: null, email: null };
  }

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

  return {
    status: "pending",
    patientProfileId: null,
    patientId: null,
    displayName: session.email,
    email: session.email,
  };
}
