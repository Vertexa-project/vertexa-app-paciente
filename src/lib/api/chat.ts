import { supabase } from "@/lib/supabase";
import { getCurrentPatientProfileId } from "@/lib/currentPatient";
import type { ChatChannel } from "./types";

/**
 * Returns the current patient's chat channel (the patient<->team channel).
 * Chain: profiles.id -> patients.profile_id -> chat_channels.patient_id.
 */
export async function getMyChannel(): Promise<ChatChannel | null> {
  const profileId = getCurrentPatientProfileId();

  // Resolve the patient row id from the profile id.
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (patientError) throw patientError;
  if (!patient) return null;

  const { data: channel, error: channelError } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("patient_id", patient.id)
    .maybeSingle();

  if (channelError) throw channelError;
  return (channel as ChatChannel) ?? null;
}
