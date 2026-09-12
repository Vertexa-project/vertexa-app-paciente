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
  avatar_path?: string | null;
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
// Vem da RPC public.channel_professionals — NÃO de embed. Ver listChannelProfessionals.
export interface ChannelProfessional {
  profileId: string;
  name: string;
  specialty: string | null;
  type: ProfessionalType | null;
  /** Códigos de public.disciplines (ex.: "medico", "nutricionista"). Pode vir vazio. */
  disciplines: string[];
}

/**
 * Membro da equipe clínica ATIVA da paciente (WP-09B2).
 *
 * Fonte: RPC public.get_my_care_team() — NÃO é o roster do chat.
 * CARE TEAM  = professional_patient_links ativos + internos + professional ativo.
 * CHAT ROSTER = channel_professionals (ChannelProfessional).
 */
export interface CareTeamMember {
  professionalId: string;
  profileId: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarPath?: string | null;
  type: ProfessionalType | null;
  specialty: string | null;
  /** Códigos de public.disciplines. Pode vir vazio. */
  disciplines: string[];
}

// A chat message with sender display already resolved for the UI.
export interface ChatMessageView {
  id: string;
  channelId: string;
  /** ANULÁVEL desde WP-CHAT-ATTACH A: mensagem só-anexo não tem texto. */
  body: string | null;
  createdAt: string | null;
  senderProfileId: string | null;
  senderRole: UserRole;
  isOwn: boolean; // true when sent by the current patient
  /**
   * `profiles.full_name` CRU do remetente, ou null. NÃO é o rótulo da tela — quem monta o rótulo é
   * `messageAuthor` (lib/chatTeam.ts), o ÚNICO lugar que resolve autor, para a bolha e a citação
   * nunca discordarem sobre a mesma pessoa. Nulo aqui é informação: significa que a RLS não deixou
   * ler aquele profile (ver WP-APP-5 no retorno), e o rótulo cai para a RPC e depois para o genérico.
   */
  senderName: string | null;
  /** Resposta a outra mensagem do canal (WP-APP-5: o app agora EXIBE e CRIA). */
  replyToMessageId: string | null;
  // Anexo (1 por mensagem; bucket privado chat-attachments, caminho {channel_id}/{uuid}.{ext}).
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
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