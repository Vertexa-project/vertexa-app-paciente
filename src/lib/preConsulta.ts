// Pré-consulta (A1) no app do paciente: tipos e regras puras (datas em Brasília, arquivos aceitos, estado do cartão do Início).

export type PreConsultaStatus = "enviada" | "rascunho" | "respondida" | "cancelada";
export interface PreConsultaQuestion { id: string; label: string; type: "short" | "long" }
export interface PreConsultaRow {
  id: string;
  appointment_starts_at: string | null;
  status: PreConsultaStatus;
  questions: PreConsultaQuestion[];
  answers: Record<string, string>;
  sent_at: string;
  answered_at: string | null;
}
export interface PreConsultaFileRow { document_id: string; title: string | null; file_path: string; mime_type: string | null }

export const ALLOWED_EXAM_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const MAX_EXAM_BYTES = 15 * 1024 * 1024;
export const MAX_EXAM_FILES = 10;
export const MAX_ANSWER_CHARS = 2000;
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function dayMonthBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(d);
}

/** Erro em português para arquivo que não pode subir; null = ok. */
export function examFileProblem(f: { type: string; size: number }, alreadySent: number): string | null {
  if (alreadySent >= MAX_EXAM_FILES) return `Você já enviou ${MAX_EXAM_FILES} arquivos. Remova algum para anexar outro.`;
  if (!(ALLOWED_EXAM_MIME as readonly string[]).includes(f.type)) return "Envie o exame em PDF ou foto (JPG, PNG ou WebP).";
  if (f.size <= 0) return "O arquivo está vazio.";
  if (f.size > MAX_EXAM_BYTES) return "O arquivo passa de 15 MB. Envie uma versão menor.";
  return null;
}

/** <patient_id>/pre-consulta/<uuid>.<ext> — a policy do storage só deixa o paciente subir nesta pasta. */
export function examObjectPath(patientId: string, mime: string, uuid: string = crypto.randomUUID()): string {
  return `${patientId}/pre-consulta/${uuid}.${EXT[mime] ?? "bin"}`;
}

export type HomeCard = { kind: "responder"; when: string; draft: boolean } | { kind: "enviada"; when: string } | null;

/** O que o cartão do Início mostra: pedido a responder; "enviada" por 7 dias depois de responder; nada se cancelado/antigo. */
export function homeCardState(row: PreConsultaRow | null, now: Date = new Date()): HomeCard {
  if (!row || row.status === "cancelada") return null;
  const when = dayMonthBR(row.appointment_starts_at);
  if (row.status === "enviada" || row.status === "rascunho") {
    if (row.appointment_starts_at && new Date(row.appointment_starts_at).getTime() < now.getTime() - 24 * 3600_000) return null;
    return { kind: "responder", when, draft: row.status === "rascunho" };
  }
  const answered = row.answered_at ? new Date(row.answered_at).getTime() : 0;
  return now.getTime() - answered <= 7 * 24 * 3600_000 ? { kind: "enviada", when } : null;
}

export const cardTitle = (when: string) => (when ? `Pré-consulta da sua consulta de ${when}` : "Pré-consulta");
