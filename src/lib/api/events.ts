import { supabase } from "@/lib/supabase";

export interface LogActivityEventInput {
  patientId: string;
  type: string;
  payload?: Record<string, unknown> | null;
}

/**
 * Inserts a row into activity_events (anon key). patientId must be patients.id.
 * This is the "patient executes -> record" half of the retention loop.
 */
export async function logActivityEvent({
  patientId,
  type,
  payload,
}: LogActivityEventInput): Promise<void> {
  const { error } = await supabase.from("activity_events").insert({
    patient_id: patientId,
    type,
    payload: payload ?? {},
  });
  if (error) throw error;
}