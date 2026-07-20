import { useQuery } from "@tanstack/react-query";
import { FileText, ImageOff, Loader2 } from "lucide-react";

import { chatAttachmentKind, getChatAttachmentSignedUrl } from "@/lib/api/chatAttachment";
import { captureException } from "@/lib/observability/sentry";

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Exibe o anexo de uma mensagem do chat (bucket PRIVADO): imagem → pré-visualização; PDF/outros →
 * cartão com nome + tamanho. A URL é ASSINADA sob demanda (TTL curto, não cacheada além do TTL) e
 * abre em nova aba. Erro de assinatura → Sentry (source:"chat-attachment", SEM PII).
 */
export function ChatAttachmentView({
  path,
  name,
  mime,
  size,
  isOwn,
}: {
  path: string;
  name: string | null;
  mime: string | null;
  size: number | null;
  isOwn: boolean;
}) {
  const { data: url, isLoading, isError } = useQuery({
    queryKey: ["chatAttachmentUrl", path],
    queryFn: async () => {
      try {
        return await getChatAttachmentSignedUrl(path);
      } catch (err) {
        captureException(new Error("chat attachment signed url failed"), {
          source: "chat-attachment",
          scope: "sign",
        });
        throw err;
      }
    },
    staleTime: 540_000, // 9 min < TTL 10 min
    gcTime: 540_000,
    retry: 1,
  });

  const kind = chatAttachmentKind(mime);
  const label = name ?? (kind === "image" ? "Imagem" : "Arquivo");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Carregando anexo…
      </div>
    );
  }

  if (isError || !url) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
        <ImageOff size={14} />
        Não foi possível carregar o anexo.
      </div>
    );
  }

  if (kind === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-border" aria-label={`Abrir imagem ${label}`}>
        <img src={url} alt={label} loading="lazy" className="max-h-56 w-auto max-w-full object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex max-w-[15rem] items-center gap-3 rounded-xl border border-border px-3 py-2 ${
        isOwn ? "bg-primary-foreground/10" : "bg-secondary/60"
      }`}
      aria-label={`Abrir arquivo ${label}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <FileText size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-foreground">{label}</span>
        <span className="block text-[10px] text-muted-foreground">{formatSize(size)}</span>
      </span>
    </a>
  );
}
