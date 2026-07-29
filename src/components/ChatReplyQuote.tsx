import { CornerUpLeft } from "lucide-react";

import { QUOTE_UNAVAILABLE, quotedPreview } from "@/lib/chatReply";
import type { ChatMessageView } from "@/lib/api";

/**
 * Citação da mensagem original, acima de uma resposta (WP-APP-3 item 4). SÓ EXIBE — não existe
 * caminho neste app para CRIAR uma resposta, porque o painel do profissional ainda não sabe
 * mostrar citação.
 *
 * Três estados, e nenhum deles quebra a lista:
 *   quoted  -> autor + trecho da original
 *   pending -> a busca da original ainda está em voo
 *   null    -> não veio (apagada, fora do canal, erro): degrada para QUOTE_UNAVAILABLE
 */
export function ChatReplyQuote({
  quoted,
  pending,
  isOwn,
}: {
  quoted: ChatMessageView | null;
  pending: boolean;
  isOwn: boolean;
}) {
  const tone = isOwn ? "text-primary-foreground/75" : "text-muted-foreground";
  const edge = isOwn ? "border-primary-foreground/40" : "border-border";
  const surface = isOwn ? "bg-primary-foreground/10" : "bg-secondary/60";

  return (
    <div className={`mb-1.5 rounded-lg border-l-2 ${edge} ${surface} px-2 py-1.5`}>
      <div className={`flex items-center gap-1 ${tone}`}>
        <CornerUpLeft size={9} className="flex-shrink-0" />
        <span className="text-[9px] font-medium truncate">
          {quoted ? quoted.displayName : pending ? "Carregando…" : "Resposta"}
        </span>
      </div>
      <p className={`mt-0.5 text-[10px] leading-snug line-clamp-2 ${tone} ${quoted ? "" : "italic"}`}>
        {quoted
          ? quotedPreview(quoted)
          : pending
            ? "Buscando a mensagem original…"
            : QUOTE_UNAVAILABLE}
      </p>
    </div>
  );
}
