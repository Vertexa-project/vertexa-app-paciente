// TEMPORARY dev-only smoke check for Etapa 4a.
// Confirms the app can read the authenticated patient and her chat channel from Supabase.
// Remove once a real screen consumes the api/ layer.
import { getPatient, getMyChannel } from "@/lib/api";

export async function runSupabaseSmokeCheck(): Promise<void> {
  console.log("[VERTEXA Supabase] smoke check: reading current patient + channel...");
  try {
    const [patient, channel] = await Promise.all([getPatient(), getMyChannel()]);
    console.log("[VERTEXA Supabase] patient:", patient?.profile?.full_name ?? "(none)", patient);
    console.log("[VERTEXA Supabase] channel:", channel?.id ?? "(none)", channel);
    if (patient && channel) {
      console.log("[VERTEXA Supabase] OK - connected and read the patient channel.");
    } else {
      console.warn("[VERTEXA Supabase] connected but patient or channel came back empty.");
    }
  } catch (err) {
    console.error("[VERTEXA Supabase] smoke check FAILED:", err);
  }
}
