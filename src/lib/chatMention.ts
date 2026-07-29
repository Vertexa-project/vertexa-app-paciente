// A CORRIDA DA MENÇÃO (WP-APP-3 item 2).
//
// O envio são DUAS chamadas sem transação: INSERT em chat_messages e, depois, INSERT em
// chat_mentions. Entre o seletor carregar e o envio acontecer, o profissional pode sair do canal.
// A policy chat_mentions_insert exige que o marcado seja participante:
//
//   is_channel_participant(message_channel(message_id))
//   AND EXISTS (select 1 from chat_participants
//                where channel_id = message_channel(message_id)
//                  and profile_id  = mentioned_profile_id)
//
// Quando ela recusa, a MENSAGEM JÁ ESTÁ NO BANCO. Dizer "falha no envio" seria mentira; reenviar
// duplicaria; apagar destruiria o que a paciente escreveu. Só a marcação não entrou — é isso, e
// só isso, que o app deve dizer.

/** Postgres: insufficient_privilege. É o código que a RLS devolve ao recusar a linha. */
const RLS_DENIED = "42501";

export type MentionFailureReason = "not_participant" | "unknown";

/**
 * Traduz o erro do INSERT em chat_mentions.
 *
 * 42501 é a policy recusando. Das duas condições do WITH CHECK, a do remetente não pode ser a
 * causa: quem não é participante do canal não teria conseguido inserir a mensagem um passo antes.
 * Sobra a outra — o marcado não está mais em chat_participants.
 *
 * Qualquer outro erro (rede, timeout, 5xx) é `unknown`: não sabemos se a marcação entrou, e o
 * texto correspondente NÃO afirma o motivo.
 */
export function classifyMentionFailure(
  error: { code?: string | null } | null | undefined,
): MentionFailureReason {
  return error?.code === RLS_DENIED ? "not_participant" : "unknown";
}

/**
 * O aviso mostrado à paciente. Começa SEMPRE afirmando que a mensagem foi enviada — porque foi.
 * Nunca sugere reenviar.
 */
export function mentionFailureMessage(name: string, reason: MentionFailureReason): string {
  const who = name.trim() || "o profissional";
  return reason === "not_participant"
    ? `Mensagem enviada. Não foi possível marcar ${who}: essa pessoa não está mais nesta conversa.`
    : `Mensagem enviada. Não foi possível marcar ${who} desta vez. Sua equipe continua vendo a mensagem.`;
}
