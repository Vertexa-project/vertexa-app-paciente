// Seam for "who is the current patient".
// Today: a fixed demo patient (Mariana) read from .env.
// Later: replace getCurrentPatientProfileId() with the authenticated user's profile id.

const DEMO_PATIENT_PROFILE_ID = import.meta.env.VITE_DEMO_PATIENT_PROFILE_ID;

if (!DEMO_PATIENT_PROFILE_ID) {
  throw new Error(
    "Missing VITE_DEMO_PATIENT_PROFILE_ID in .env (demo patient profile id)"
  );
}

/**
 * Returns the profiles.id of the current patient.
 * Demo mode returns the seeded patient; swap for real auth later.
 */
export function getCurrentPatientProfileId(): string {
  return DEMO_PATIENT_PROFILE_ID;
}
