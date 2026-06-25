import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

const BUCKET = "progress-photos";

export interface ProgressPhotoRow {
  id: string;
  patient_id: string;
  photo_url: string;
  captured_in_app: boolean | null;
  taken_at: string | null;
}

export interface UploadProgressPhotoResult {
  url: string;
  row: ProgressPhotoRow;
}

function extFromFile(file: File): string {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const fromType = file.type?.split("/").pop();
  return fromType && /^[a-z0-9]{2,5}$/.test(fromType) ? fromType : "jpg";
}

/**
 * Foto de EVOLUÇÃO (decisão C3): sobe o binário para o bucket 'progress-photos' (público na
 * sprint) e insere a linha em progress_photos (patient_id, photo_url, captured_in_app, taken_at)
 * com photo_url = URL pública. A web LÊ via getProgressPhotos() (grade de <img src=photo_url>).
 * Dívida Sessão 8 (LGPD): bucket privado + signed URL + INSERT escopado por paciente/pasta.
 */
export async function uploadProgressPhoto(file: File): Promise<UploadProgressPhotoResult> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");

  const path = `${patientId}/${Date.now()}.${extFromFile(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const photoUrl = pub.publicUrl;

  const { data, error } = await supabase
    .from("progress_photos")
    .insert({ patient_id: patientId, photo_url: photoUrl, captured_in_app: true })
    .select("*")
    .single();
  if (error) throw error;

  return { url: photoUrl, row: data as ProgressPhotoRow };
}

/** Foto de progresso mais recente do paciente (para preview/pendência). null se não houver. */
export async function getLatestProgressPhoto(): Promise<ProgressPhotoRow | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;

  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("patient_id", patientId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ProgressPhotoRow) ?? null;
}
