// Minimal types mirroring the public schema columns this app reads.
// Hand-written (not generated) to keep the foundation lean; expand as screens migrate.

export type UserRole = "professional" | "patient" | "admin";

export type ProfessionalType =
  | "doctor"
  | "nutritionist"
  | "physiotherapist"
  | "personal_trainer"
  | "other";

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

// A professional participant of a chat channel (source for the @ selector).
export interface ChannelProfessional {
  profileId: string;
  name: string;
  specialty: string | null;
  type: ProfessionalType | null;
}

// A chat message with sender display already resolved for the UI.
export interface ChatMessageView {
  id: string;
  channelId: string;
  body: string;
  createdAt: string | null;
  senderProfileId: string | null;
  senderRole: UserRole;
  isOwn: boolean; // true when sent by the current (demo) patient
  displayName: string; // "Você" for own messages, professional full name otherwise
  specialty: string | null;
  type: ProfessionalType | null;
}

// muscle_recovery_states.status enum (web color: fatigued=red, recovering=yellow,
// recovered=blue, weakened=green, neutral=grey). Freshly trained = 'fatigued'.
export type MuscleStatus =
  | "fatigued"
  | "recovering"
  | "recovered"
  | "weakened"
  | "neutral";

// Canonical muscle keys the web BodyMap paints (English lowercase). The ONLY
// values allowed in muscle_recovery_states.muscle_group. See CONTRATO_INTEGRACAO.
export type CanonicalMuscle =
  | "chest"
  | "biceps"
  | "triceps"
  | "lats"
  | "shoulders"
  | "abs"
  | "forearms"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "traps"
  | "lower_back";

export interface MuscleRecoveryState {
  id: string;
  patient_id: string;
  muscle_group: CanonicalMuscle;
  last_trained_at: string | null;
  last_intensity: number | null;
  status: MuscleStatus;
  calculated_at: string | null;
}