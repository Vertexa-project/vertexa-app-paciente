// Minimal types mirroring the public schema columns this app reads.
// Hand-written (not generated) to keep the foundation lean; expand as screens migrate.

export type UserRole = "professional" | "patient" | "admin";

export interface Profile {
  id: string;
  auth_user_id: string | null;
  role: UserRole;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface Patient {
  id: string;
  profile_id: string;
  clinic_id: string | null;
  birth_date: string | null;
  sex: string | null;
  height_cm: number | null;
  goal: string | null;
  start_date: string | null;
  start_weight: number | null;
  current_weight: number | null;
  target_weight: number | null;
}

export interface PatientWithProfile extends Patient {
  profile: Profile | null;
}

export interface ChatChannel {
  id: string;
  patient_id: string;
  created_at: string | null;
}
