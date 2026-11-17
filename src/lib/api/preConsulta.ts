import { supabase } from "@/lib/supabase";
import { examObjectPath, type PreConsultaFileRow, type PreConsultaRow } from "@/lib/preConsulta";
import { getMyPatientId } from "./patient";

const BUCKET = "patient-documents";
const COLS = "id, appointment_starts_at, status, questions, answers, sent_at, answered_at";

/** O pedido mais recente que não foi cancelado (a RLS já esconde os cancelados do paciente). */
export async function getMyPreConsulta(): Promise<PreConsultaRow | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;
  const { data, error } = await supabase.from("pre_consultas").select(COLS).eq("patient_id", patientId).order("sent_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as unknown as PreConsultaRow | null) ?? null;
}

interface RawFile { document_id: string; doc: { title: string | null; file_path: string; mime_type: string | null } | null }

export async function getMyPreConsultaFiles(preConsultaId: string): Promise<PreConsultaFileRow[]> {
  const { data, error } = await supabase
    .from("pre_consulta_files")
    .select("document_id, doc:patient_documents ( title, file_path, mime_type )")
    .eq("pre_consulta_id", preConsultaId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawFile[]).filter((f) => f.doc).map((f) => ({ document_id: f.document_id, ...(f.doc as NonNullable<RawFile["doc"]>) }));
}

export async function savePreConsultaDraft(id: string, answers: Record<string, string>): Promise<void> {
  const { error } = await supabase.rpc("save_pre_consulta_draft", { p_id: id, p_answers: answers });
  if (error) throw error;
}

export async function submitPreConsulta(id: string, answers: Record<string, string>): Promise<void> {
  const { error } = await supabase.rpc("submit_pre_consulta", { p_id: id, p_answers: answers });
  if (error) throw error;
}

/** Sobe o exame no bucket privado e registra no pedido (que também o põe em Documentos da ficha). Se o registro falhar, apaga o arquivo. */
export async function uploadPreConsultaFile(id: string, file: File): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Sem paciente.");
  const path = examObjectPath(patientId, file.type);
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.rpc("attach_pre_consulta_file", { p_id: id, p_path: path, p_name: file.name, p_mime: file.type, p_size: file.size });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function removePreConsultaFile(documentId: string): Promise<void> {
  const { data, error } = await supabase.rpc("remove_pre_consulta_file", { p_document_id: documentId });
  if (error) throw error;
  if (typeof data === "string" && data) await supabase.storage.from(BUCKET).remove([data]); // melhor esforço: o registro já saiu
}
