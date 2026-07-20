import { supabase } from "@/lib/supabase";
import { getCurrentPatientProfileId } from "@/lib/currentPatient";
import {
  deleteChatAttachmentObject,
  sendWithOrphanCleanup,
  uploadChatAttachment,
} from "./chatAttachment";
import type {
  ChatChannel,
  ChannelProfessional,
  ChatMessageView,
  ProfessionalType,
} from "./types";

/**
 * Returns the current patient's chat channel (the patient<->team channel).
 * Chain: profiles.id -> patients.profile_id -> chat_channels.patient_id.
 */
export async function getMyChannel(): Promise<ChatChannel | null> {
  const profileId = getCurrentPatientProfileId();
  // Sem profile atuante (ex.: modo real pré-login) → sem canal. Evita `.eq("profile_id","")`,
  // que numa coluna uuid é um 400 (invalid input syntax for uuid), não "0 linhas".
  if (!profileId) return null;

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

interface RawMessageRow {
  id: string;
  channel_id: string;
  sender_profile_id: string | null;
  sender_role: ChatMessageView["senderRole"];
  body: string | null;
  created_at: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  sender: {
    id: string;
    full_name: string;
    professionals: { type: ProfessionalType | null; specialty: string | null }[] | null;
  } | null;
}

/**
 * Messages of a channel, ordered by created_at, with sender display resolved:
 * - professional -> full name + specialty
 * - the current patient -> "Você"
 */
export async function getChannelMessages(channelId: string): Promise<ChatMessageView[]> {
  const myProfileId = getCurrentPatientProfileId();

  const { data, error } = await supabase
    .from("chat_messages")
    .select(
      "id, channel_id, sender_profile_id, sender_role, body, created_at, " +
        "attachment_path, attachment_name, attachment_mime, attachment_size, " +
        "sender:profiles(id, full_name, professionals(type, specialty))"
    )
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawMessageRow[];
  return rows.map((row) => {
    const prof = row.sender?.professionals?.[0] ?? null;
    const isOwn = row.sender_profile_id === myProfileId;
    return {
      id: row.id,
      channelId: row.channel_id,
      body: row.body,
      createdAt: row.created_at,
      senderProfileId: row.sender_profile_id,
      senderRole: row.sender_role,
      isOwn,
      displayName: isOwn ? "Você" : row.sender?.full_name ?? "Profissional",
      specialty: prof?.specialty ?? null,
      type: prof?.type ?? null,
      attachmentPath: row.attachment_path,
      attachmentName: row.attachment_name,
      attachmentMime: row.attachment_mime,
      attachmentSize: row.attachment_size,
    };
  });
}

interface RawParticipantRow {
  profile_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string;
    professionals: { type: ProfessionalType | null; specialty: string | null }[] | null;
  } | null;
}

/**
 * The professional participants of a channel — source for the @ selector.
 */
export async function listChannelProfessionals(
  channelId: string
): Promise<ChannelProfessional[]> {
  const { data, error } = await supabase
    .from("chat_participants")
    .select("profile_id, role, profiles(id, full_name, professionals(type, specialty))")
    .eq("channel_id", channelId)
    .eq("role", "professional");

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawParticipantRow[];
  return rows.map((row) => {
    const prof = row.profiles?.professionals?.[0] ?? null;
    return {
      profileId: row.profile_id,
      name: row.profiles?.full_name ?? "Profissional",
      specialty: prof?.specialty ?? null,
      type: prof?.type ?? null,
    };
  });
}

export interface SendPatientMessageInput {
  channelId: string;
  /** Legenda opcional; pode ser vazia quando há anexo (mensagem só-anexo). */
  body?: string | null;
  mentionedProfileId?: string | null;
  /** Anexo opcional (PDF/imagem). */
  file?: File | null;
}

/**
 * Inserts a patient message into chat_messages (sender_role='patient',
 * sender_profile_id = demo patient), com anexo OPCIONAL. Se houver arquivo: valida → sobe →
 * insere; se o insert falhar, o objeto órfão é removido (sendWithOrphanCleanup). Exige body OU
 * anexo (espelha o CHECK do banco). Se houver menção, insere chat_mentions referenciando a mensagem.
 */
export async function sendPatientMessage({
  channelId,
  body,
  mentionedProfileId,
  file,
}: SendPatientMessageInput): Promise<{ id: string }> {
  const senderProfileId = getCurrentPatientProfileId();
  const text = body?.trim() ? body.trim() : null;
  if (!text && !file) throw new Error("Escreva uma mensagem ou anexe um arquivo.");

  const message = await sendWithOrphanCleanup<{ id: string }>({
    upload: () => (file ? uploadChatAttachment(channelId, file) : Promise.resolve(null)),
    insert: async (attachment) => {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: channelId,
          sender_role: "patient",
          sender_profile_id: senderProfileId,
          body: text,
          attachment_path: attachment?.path ?? null,
          attachment_name: attachment?.name ?? null,
          attachment_mime: attachment?.mime ?? null,
          attachment_size: attachment?.size ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },
    removeObject: (path) => deleteChatAttachmentObject(path),
  });

  if (mentionedProfileId) {
    const { error: mentionError } = await supabase.from("chat_mentions").insert({
      message_id: message.id,
      mentioned_profile_id: mentionedProfileId,
    });
    if (mentionError) throw mentionError;
  }

  return { id: message.id };
}

export interface ChannelSubscriptionHandlers {
  onInsert: () => void;
  onStatus?: (status: string) => void;
}

/**
 * Subscribes to INSERTs on chat_messages for a channel via Realtime.
 * Returns an unsubscribe function. The api layer owns the supabase client so
 * screens/hooks never import it directly.
 */
export function subscribeToChannelMessages(
  channelId: string,
  handlers: ChannelSubscriptionHandlers
): () => void {
  const channel = supabase
    .channel(`chat_messages:${channelId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `channel_id=eq.${channelId}`,
      },
      () => handlers.onInsert()
    )
    .subscribe((status) => handlers.onStatus?.(status));

  return () => {
    supabase.removeChannel(channel);
  };
}