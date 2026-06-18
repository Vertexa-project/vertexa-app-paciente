import { supabase } from "@/lib/supabase";
import { getCurrentPatientProfileId } from "@/lib/currentPatient";
import type { PatientWithProfile } from "./types";

/**
 * Returns the current patient (demo: Mariana) joined with its profile.
 * Resolves by profiles.id via the patients.profile_id FK.
 */
export async function getPatient(): Promise<PatientWithProfile | null> {
  const profileId = getCurrentPatientProfileId();

  const { data, error } = await supabase
    .from("patients")
    .select("*, profile:profiles(*)")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return (data as PatientWithProfile) ?? null;
}

let patientIdPromise: Promise<string | null> | null = null;

/**
 * Resolves the current patient's patients.id (NOT the profile id) and memoizes it
 * for the session. activity_events.patient_id references patients.id.
 */
export function getMyPatientId(): Promise<string | null> {
  if (!patientIdPromise) {
    patientIdPromise = (async () => {
      const profileId = getCurrentPatientProfileId();
      const { data, error } = await supabase
        .from("patients")
        .select("id")
        .eq("profile_id", profileId)
        .maybeSingle();
      if (error) throw error;
      return (data?.id as string) ?? null;
    })().catch((err) => {
      // Allow a later retry instead of caching the failure.
      patientIdPromise = null;
      throw err;
    });
  }
  return patientIdPromise;
}