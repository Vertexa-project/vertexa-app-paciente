import { supabase } from "@/lib/supabase";

// Anexo do chat (WP-CHAT-ATTACH B) — contrato IDÊNTICO ao do painel web e ao que a Parte A aplicou:
//  · bucket privado chat-attachments; caminho {channel_id}/{uuid}.{ext}
//  · tipos: application/pdf, image/jpeg, image/png, image/webp ; teto 10 MB (== file_size_limit)
// A barreira REAL é a RLS/servidor (Parte A). Aqui: validação de UX + path determinístico + I/O de storage.
// As funções PURAS abaixo espelham exatamente as do web (provado por teste de coerência).

export const CHAT_ATTACHMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type ChatAttachmentMime = (typeof CHAT_ATTACHMENT_MIME)[number];

/** Teto de tamanho — coincide com file_size_limit do bucket (10 MB). */
export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Extensão canônica pelo MIME (o path usa SEMPRE o mime, nunca o nome do arquivo). */
export function chatAttachmentExt(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

/** Caminho do objeto: {channel_id}/{uuid}.{ext}. Os dois clientes DEVEM gerar este formato. */
export function buildChatAttachmentPath(channelId: string, uuid: string, mime: string): string {
  return `${channelId}/${uuid}.${chatAttachmentExt(mime)}`;
}

/** Valida tipo + tamanho ANTES do upload. Retorna mensagem amigável (PT-BR) ou null se OK. */
export function validateChatAttachment(file: { type: string; size: number }): string | null {
  if (!CHAT_ATTACHMENT_MIME.includes(file.type as ChatAttachmentMime)) {
    return "Formato não suportado. Envie PDF, JPG, PNG ou WEBP.";
  }
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return "Arquivo muito grande. O limite é 10 MB.";
  }
  return null;
}

export type ChatAttachmentKind = "image" | "document";

/** Escolha de renderização: imagem (pré-visualização) vs documento (cartão). */
export function chatAttachmentKind(mime: string | null | undefined): ChatAttachmentKind {
  return mime && mime.startsWith("image/") ? "image" : "document";
}

export interface PreparedChatAttachment {
  path: string;
  name: string;
  mime: string;
  size: number;
}

/**
 * Orquestra o envio com anexo garantindo AUTO-LIMPEZA DE ÓRFÃO: se o upload der certo mas o INSERT
 * da mensagem falhar, remove imediatamente o objeto recém-enviado (a policy de DELETE da Parte A
 * existe exatamente para isso — órfão do próprio uploader). PURO (deps injetadas), testável sem rede.
 */
export async function sendWithOrphanCleanup<T>(deps: {
  upload: () => Promise<PreparedChatAttachment | null>;
  insert: (attachment: PreparedChatAttachment | null) => Promise<T>;
  removeObject: (path: string) => Promise<void>;
}): Promise<T> {
  const attachment = await deps.upload();
  try {
    return await deps.insert(attachment);
  } catch (err) {
    if (attachment) {
      try {
        await deps.removeObject(attachment.path);
      } catch {
        // best-effort: ainda propagamos o erro original do insert.
      }
    }
    throw err;
  }
}

// ---- I/O de storage (bucket PRIVADO; leitura só por signed URL) ----

const ATTACHMENT_BUCKET = "chat-attachments";
const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 600; // 10 min

/** Sobe o anexo para o bucket privado e devolve os 4 campos. Valida tipo/tamanho antes do I/O. */
export async function uploadChatAttachment(
  channelId: string,
  file: File,
): Promise<PreparedChatAttachment> {
  const invalid = validateChatAttachment(file);
  if (invalid) throw new Error(invalid);
  const path = buildChatAttachmentPath(channelId, crypto.randomUUID(), file.type);
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, name: file.name, mime: file.type, size: file.size };
}

/** Remove o objeto recém-enviado (auto-limpeza de órfão quando o INSERT falha). */
export async function deleteChatAttachmentObject(path: string): Promise<void> {
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
  if (error) throw error;
}

/** URL assinada de curta duração para abrir/pré-visualizar o anexo (bucket privado; gerada no clique). */
export async function getChatAttachmentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, ATTACHMENT_SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Não foi possível gerar o link do anexo.");
  return data.signedUrl;
}
