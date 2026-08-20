import { supabase } from "@/lib/supabase";
import { getCurrentPatientProfileId } from "@/lib/currentPatient";
import type { PatientWithProfile } from "./types";

/**
 * Returns the current authenticated patient joined with its profile.
 * its profile. Resolves by profiles.id via the patients.profile_id FK.
 */
export async function getPatient(): Promise<PatientWithProfile | null> {
  const profileId = getCurrentPatientProfileId();
  // Sem profile atuante (ex.: modo real pré-login) → sem dados. Evita `.eq("profile_id","")`,
  // que numa coluna uuid é um 400 (invalid input syntax for uuid), não "0 linhas".
  if (!profileId) return null;

  const { data, error } = await supabase
    .from("patients")
    .select("*, profile:profiles(*)")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return (data as PatientWithProfile) ?? null;
}

/** Registro mínimo do paciente atuante, resolvido a partir do auth.uid() (login real). */
export interface PatientIdentityRecord {
  /** profiles.id (o "profile do paciente atuante"). */
  profileId: string;
  /** patients.id. */
  patientId: string;
  /** profiles.full_name (exibição). */
  displayName: string | null;
}

/**
 * Resolve o paciente a partir do auth.uid() (login real): auth_user_id → profiles.id →
 * patients.profile_id. Retorna null quando NÃO há um `patients` ligado ao profile do uid
 * (profile 'pending' recém-criado pelo trigger, ou sem profile) → o resolver trata como
 * 'pending' (FAIL-CLOSED). Nunca lê o pin de demo.
 */
export async function getPatientByAuthUserId(
  authUserId: string
): Promise<PatientIdentityRecord | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, patients(id)")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as { id: string; full_name: string | null; patients: { id: string }[] | { id: string } | null };
  const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
  if (!patient) return null; // profile existe mas SEM patient → pending, não active.

  return { profileId: row.id, patientId: patient.id, displayName: row.full_name ?? null };
}

// Memo de patients.id da sessão, CHAVEADO pelo profile atuante. Ao trocar de identidade
// (o pin) → resolve uma vez, igual a antes. Em real, ao trocar de identidade (login/logout) o
// profile muda → re-resolve automaticamente (não serve o patientId de outra identidade).
let patientIdCache: { profileId: string; promise: Promise<string | null> } | null = null;

/**
 * Resolves the current patient's patients.id (NOT the profile id) and memoizes it per acting
 * profile. activity_events.patient_id references patients.id.
 */
export function getMyPatientId(): Promise<string | null> {
  const profileId = getCurrentPatientProfileId();
  if (!patientIdCache || patientIdCache.profileId !== profileId) {
    patientIdCache = {
      profileId,
      promise: (async () => {
        if (!profileId) return null; // sem profile atuante → sem patients.id (evita 400 de uuid "").
        const { data, error } = await supabase
          .from("patients")
          .select("id")
          .eq("profile_id", profileId)
          .maybeSingle();
        if (error) throw error;
        return (data?.id as string) ?? null;
      })().catch((err) => {
        // Allow a later retry instead of caching the failure (só invalida a própria chave).
        if (patientIdCache?.profileId === profileId) patientIdCache = null;
        throw err;
      }),
    };
  }
  return patientIdCache.promise;
}
