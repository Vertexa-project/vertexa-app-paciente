// CITAÇÃO DE RESPOSTA — SÓ EXIBIÇÃO (WP-APP-3 item 4).
//
// O app renderiza a citação de chat_messages.reply_to_message_id, mas NÃO cria respostas: o painel
// do profissional ainda não sabe exibir citação, e um lado não deve criar o que o outro não mostra.
// Nada neste arquivo escreve; tudo é derivação da lista já carregada.
import type { ChatMessageView } from "@/lib/api/types";

/** Texto quando a mensagem citada não pôde ser resolvida. Degrada; nunca quebra a lista. */
export const QUOTE_UNAVAILABLE = "Mensagem original indisponível";

/**
 * Trecho curto da mensagem citada. `body` é anulável (mensagem só-anexo), então cai para o nome
 * do arquivo antes de virar rótulo genérico.
 */
export function quotedPreview(msg: ChatMessageView, maxChars = 120): string {
  const body = msg.body?.trim();
  if (body) {
    return body.length > maxChars ? `${body.slice(0, maxChars).trimEnd()}…` : body;
  }
  const attachmentName = msg.attachmentName?.trim();
  if (attachmentName) return attachmentName;
  if (msg.attachmentPath) return "Anexo";
  return "Mensagem sem texto";
}

/**
 * Ids citados que NÃO estão na lista carregada — os únicos que justificam uma busca extra.
 * Sem duplicatas e estável na ordem de aparição, para servir de chave de cache.
 */
export function missingQuotedIds(messages: ChatMessageView[]): string[] {
  const loaded = new Set(messages.map((m) => m.id));
  const missing = new Set<string>();
  for (const m of messages) {
    const id = m.replyToMessageId;
    if (id && !loaded.has(id)) missing.add(id);
  }
  return [...missing];
}

/** Índice id -> mensagem, juntando as já carregadas e as buscadas depois. */
export function indexById(...groups: ChatMessageView[][]): Map<string, ChatMessageView> {
  const map = new Map<string, ChatMessageView>();
  for (const group of groups) {
    for (const m of group) map.set(m.id, m);
  }
  return map;
}
