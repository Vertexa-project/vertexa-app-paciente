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
