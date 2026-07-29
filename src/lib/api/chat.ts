import { supabase } from "@/lib/supabase";
import { getCurrentPatientProfileId } from "@/lib/currentPatient";
import { classifyMentionFailure, type MentionFailureReason } from "@/lib/chatMention";
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
  reply_to_message_id: string | null;
  sender: {
    id: string;
    full_name: string;
    professionals: { type: ProfessionalType | null; specialty: string | null }[] | null;
  } | null;
}

const MESSAGE_SELECT =
  "id, channel_id, sender_profile_id, sender_role, body, created_at, " +
  "attachment_path, attachment_name, attachment_mime, attachment_size, reply_to_message_id, " +
  "sender:profiles(id, full_name, professionals(type, specialty))";

function toMessageView(row: RawMessageRow, myProfileId: string | null): ChatMessageView {
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
    replyToMessageId: row.reply_to_message_id,
  };
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
    .select(MESSAGE_SELECT)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as RawMessageRow[]).map((row) => toMessageView(row, myProfileId));
}

/**
 * Busca pontual de mensagens por id, dentro do canal — usada SÓ para resolver a citação de uma
 * resposta cuja mensagem original não está na lista carregada (WP-APP-3 item 4). O que não vier
 * (apagada, fora do canal, sem permissão) simplesmente não aparece no retorno: quem chama degrada
 * para "mensagem original indisponível" em vez de quebrar a lista.
 */
export async function getMessagesByIds(
  channelId: string,
  ids: string[]
): Promise<ChatMessageView[]> {
  if (ids.length === 0) return [];
  const myProfileId = getCurrentPatientProfileId();

  const { data, error } = await supabase
    .from("chat_messages")
    .select(MESSAGE_SELECT)
    .eq("channel_id", channelId)
    .in("id", ids);

  if (error) throw error;

  return ((data ?? []) as unknown as RawMessageRow[]).map((row) => toMessageView(row, myProfileId));
}

interface RawChannelProfessionalRow {
  profile_id: string;
  full_name: string | null;
  type: ProfessionalType | null;
  specialty: string | null;
  disciplines: string[] | null;
}

/**
 * The professional participants of a channel — source for the @ selector.
 *
 * WP-APP-3 item 1: vem da RPC public.channel_professionals, NÃO de embed. O embed anterior era
 * `chat_participants -> profiles -> professionals(type, specialty)`, e a RLS de `professionals`
 * (`profile_id = current_profile_id() OR is_clinic_admin(clinic_id)`) não deixa a PACIENTE ler
 * nenhuma dessas linhas. O embed aninhado não erra nisso: devolve array VAZIO. Resultado, tipo e
 * especialidade chegavam sempre nulos, sem sinal nenhum de falha — o bug silencioso que motivou
 * a RPC. A RPC é SECURITY DEFINER com portão em can_read_channel (fail-closed) e ainda traz
 * `disciplines`, que o embed nem alcançava.
 *
 * Erro NÃO é engolido: propaga para a tela mostrar falha visível em vez de lista vazia.
 */
export async function listChannelProfessionals(
  channelId: string
): Promise<ChannelProfessional[]> {
  const { data, error } = await supabase.rpc("channel_professionals", {
    p_channel_id: channelId,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawChannelProfessionalRow[];
  return rows.map((row) => ({
    profileId: row.profile_id,
    name: row.full_name?.trim() || "Profissional",
    specialty: row.specialty,
    type: row.type,
    disciplines: row.disciplines ?? [],
  }));
}

export interface SendPatientMessageInput {
  channelId: string;
  /** Legenda opcional; pode ser vazia quando há anexo (mensagem só-anexo). */
  body?: string | null;
  mentionedProfileId?: string | null;
  /** Anexo opcional (PDF/imagem). */
  file?: File | null;
}

export interface SendPatientMessageResult {
  id: string;
  /** true SÓ quando havia menção pedida e o INSERT em chat_mentions não entrou. */
  mentionFailed: boolean;
  mentionFailureReason: MentionFailureReason | null;
}

/**
 * Inserts a patient message into chat_messages (sender_role='patient',
 * sender_profile_id = demo patient), com anexo OPCIONAL. Se houver arquivo: valida → sobe →
 * insere; se o insert falhar, o objeto órfão é removido (sendWithOrphanCleanup). Exige body OU
 * anexo (espelha o CHECK do banco). Se houver menção, insere chat_mentions referenciando a mensagem.
 *
 * WP-APP-3 item 2 — A CORRIDA DA MENÇÃO. São duas chamadas, sem transação. Se o profissional sair
 * do canal entre o seletor carregar e o envio acontecer, a policy chat_mentions_insert recusa a
 * marcação — e a MENSAGEM JÁ ESTÁ NO BANCO. Por isso a falha da menção NÃO é relançada: ela vira
 * campo do resultado. Relançar faria a tela dizer que o envio falhou, e o caminho de erro
 * convidaria a reenviar — duplicando uma mensagem que já chegou à equipe. Nada é apagado.
 * A falha do INSERT da MENSAGEM continua sendo erro de verdade e continua sendo relançada.
 */
export async function sendPatientMessage({
  channelId,
  body,
  mentionedProfileId,
  file,
}: SendPatientMessageInput): Promise<SendPatientMessageResult> {
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

  if (!mentionedProfileId) {
    return { id: message.id, mentionFailed: false, mentionFailureReason: null };
  }

  const { error: mentionError } = await supabase.from("chat_mentions").insert({
    message_id: message.id,
    mentioned_profile_id: mentionedProfileId,
  });

  if (!mentionError) {
    return { id: message.id, mentionFailed: false, mentionFailureReason: null };
  }

  return {
    id: message.id,
    mentionFailed: true,
    mentionFailureReason: classifyMentionFailure(mentionError),
  };
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