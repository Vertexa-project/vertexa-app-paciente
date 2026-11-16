// Meus documentos (redesign P6): documentos que a clínica enviou ao app. Regras puras (texto e ordem).
export type DeliveryKind = "treino" | "plano_alimentar" | "documento" | "relatorio";

export const DELIVERY_KIND_LABEL: Record<DeliveryKind, string> = {
  treino: "Treino",
  plano_alimentar: "Plano alimentar",
  documento: "Documento",
  relatorio: "Relatório",
};

export interface DeliveryRow {
  id: string;
  kind: DeliveryKind;
  title: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  sent_at: string;
  first_opened_at: string | null;
  sender_name: string | null;
}

const TZ = "America/Sao_Paulo";

/** "16/11/2026", no dia de Brasília. */
export function sentDateBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

/** "1,2 MB" / "340 KB" com vírgula decimal. */
export function fileSizeText(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}

export const unopened = (list: Pick<DeliveryRow, "first_opened_at">[]): number => list.filter((d) => !d.first_opened_at).length;

/** Nome do arquivo ao baixar: título sem acento/símbolos + .pdf (ou a extensão do original). */
export function downloadName(d: Pick<DeliveryRow, "title" | "file_path" | "mime_type">): string {
  const base = d.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase() || "documento";
  const ext = d.mime_type === "application/pdf" ? "pdf" : (d.file_path.split(".").pop() ?? "pdf").toLowerCase().slice(0, 5);
  return `${base}.${ext}`;
}
