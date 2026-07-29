// Corpo da mensagem que o SOS envia para a conversa da equipe (WP-APP-7 item 2.1).
//
// UM LUGAR SÓ monta o texto — é regra de conteúdo, não de tela, e o teste mora nela.
//
// REGRA INEGOCIÁVEL: o texto da paciente vai INTEIRO, cru, sem truncar, sem reescrever e sem
// resumir. O defeito que este WP corrige foi exatamente reduzir o que ela escreveu a um
// booleano (`hasMessage`) e jogar o resto fora. Não há limite de tamanho no caminho:
// `chat_messages.body` é `text` sem `character_maximum_length`, e o único CHECK da tabela é
// `body IS NOT NULL OR attachment_path IS NOT NULL`.

/** Prefixo que diz ao profissional de onde a mensagem veio. É verdade: ela veio dessa tela. */
export const SOS_PREFIX = "Preciso de ajuda";

export interface SosMessageInput {
  /** Rótulo da categoria como a paciente a leu na tela (ex.: "Dificuldade com dieta"). */
  categoryLabel: string;
  /** O que ela escreveu. Opcional na tela — o campo é "conte mais (opcional)". */
  message: string;
}

/**
 * Monta o corpo. Sem texto livre, sobra o cabeçalho — que já é uma mensagem legítima e
 * satisfaz o CHECK do banco (corpo não-nulo). `sendPatientMessage` recusaria corpo vazio, e
 * é por isso que o cabeçalho nunca é opcional aqui.
 */
export function buildSosMessageBody({ categoryLabel, message }: SosMessageInput): string {
  const header = `${SOS_PREFIX} — ${categoryLabel}`;
  const body = message.trim();
  return body ? `${header}\n\n${body}` : header;
}
