import { supabase } from "@/lib/supabase";
import { captureException } from "@/lib/observability/sentry";
import { getMyPatientId } from "./patient";
import type { PhotoPose } from "@/lib/photoPose";

// Bucket PRIVADO desde WP-STORAGE P1 (public=false). Leitura = createSignedUrl(storage_path).
const BUCKET = "progress-photos";
// TTL curto; a signed URL NÃO é persistida nem cacheada além disto (ver query em Progress.tsx).
const SIGNED_URL_TTL_SECONDS = 600; // 10 min

/** Guardas de upload (WP-STORAGE P2): MIME de imagem aceitos + teto de tamanho. */
export const ALLOWED_PROGRESS_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedProgressPhotoMime = (typeof ALLOWED_PROGRESS_PHOTO_MIME)[number];
export const MAX_PROGRESS_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

const EXT_BY_MIME: Record<AllowedProgressPhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface ProgressPhotoRow {
  id: string;
  patient_id: string;
  /** WP-HARDENING A5/B2: coluna nullable; o app não grava mais photo_url (só fallback de leitura legado). */
  photo_url: string | null;
  /** WP-STORAGE-P2: path canônico {patient_id}/{uuid}.ext no bucket privado. NULL = linha legada. */
  storage_path: string | null;
  captured_in_app: boolean | null;
  taken_at: string | null;
  /** WP-PHOTOS-A: 'front' | 'side' | 'back' | null (sem posição — fotos antigas). */
  pose?: "front" | "side" | "back" | null;
}

/** Foto já resolvida p/ exibição: `display_url` = signed URL, fallback legado ou null. */
export type ProgressPhotoWithUrl = ProgressPhotoRow & { display_url: string | null };

export interface UploadProgressPhotoResult {
  url: string;
  row: ProgressPhotoRow;
}

/** Erro de validação de upload (MIME/tamanho) — mensagem amigável ao usuário, sem PII. */
export class ProgressPhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressPhotoValidationError";
  }
}

/**
 * Valida MIME allowlist + teto de tamanho. PURA/testável; lança ProgressPhotoValidationError
 * com mensagem amigável. É a barreira de UX — a barreira REAL é a RLS de storage.objects (P1).
 */
export function validateProgressPhotoFile(file: Pick<File, "type" | "size">): void {
  if (!ALLOWED_PROGRESS_PHOTO_MIME.includes(file.type as AllowedProgressPhotoMime)) {
    throw new ProgressPhotoValidationError("Formato não suportado. Envie uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > MAX_PROGRESS_PHOTO_BYTES) {
    throw new ProgressPhotoValidationError("Imagem muito grande. O limite é 10 MB.");
  }
}

/** Extensão canônica a partir do MIME já validado. PURA. */
export function progressPhotoExt(mime: string): string {
  return EXT_BY_MIME[mime as AllowedProgressPhotoMime] ?? "jpg";
}

/**
 * Monta o storage key CANÔNICO {patient_id}/{uuid}.ext — a ÚNICA fonte do path. PURA/testável.
 * A 1ª pasta É o patient_id: exatamente o que a policy da Parte 1 escopa
 * (storage_object_patient(name) = current_patient_id() no INSERT). Recusa patient_id vazio
 * (fail-closed): o app NUNCA monta path com id que não seja o do paciente logado.
 */
export function progressPhotoStorageKey(patientId: string, uuid: string, ext: string): string {
  if (!patientId) throw new Error("patient_id ausente ao montar o path da foto");
  return `${patientId}/${uuid}.${ext}`;
}

/**
 * Resolve a URL de exibição de UMA foto (bucket privado desde P1):
 *  - `storage_path` presente ⇒ createSignedUrl (TTL curto, nunca persistida);
 *  - `storage_path` null (linha legada) ⇒ fallback `photo_url` (URL pública legada);
 *  - erro ao assinar ⇒ Sentry (source:"storage", SEM PII) e retorna null (placeholder; não quebra).
 */
export async function resolveProgressPhotoDisplayUrl(
  photo: Pick<ProgressPhotoRow, "storage_path" | "photo_url">,
): Promise<string | null> {
  if (photo.storage_path) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      if (data?.signedUrl) return data.signedUrl;
      throw new Error("createSignedUrl não retornou signedUrl");
    } catch (err) {
      captureException(err, { source: "storage", scope: "sign-progress-photo" });
      return null;
    }
  }
  return photo.photo_url ?? null;
}

/**
 * Foto de EVOLUÇÃO (WP-STORAGE P2): sobe o binário para o bucket PRIVADO 'progress-photos' no
 * path canônico {patient_id}/{uuid}.ext (patient_id = paciente logado; ownership) e insere a
 * linha em progress_photos com storage_path (contrato principal).
 * Guardas: MIME allowlist + teto de 10 MB (validados ANTES de qualquer I/O).
 * Leitura é signed URL (ver getMyProgressPhotos).
 * WP-HARDENING B2 (depende de A5 tornar photo_url nullable): o app NÃO grava mais photo_url — o
 * fallback legado de LEITURA (resolveProgressPhotoDisplayUrl) permanece para linhas antigas.
 */
export async function uploadProgressPhoto(file: File, pose: PhotoPose | null = null): Promise<UploadProgressPhotoResult> {
  validateProgressPhotoFile(file); // MIME + tamanho, fail-closed antes de qualquer upload.

  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");

  // Path canônico {patient_id}/{uuid}.ext — o patient_id SEMPRE do paciente logado (ownership),
  // e o {uuid} garante unicidade. Coerente com a policy da Parte 1 (pasta = patient_id).
  const path = progressPhotoStorageKey(patientId, crypto.randomUUID(), progressPhotoExt(file.type));

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  // WP-HARDENING B2: NÃO grava mais photo_url (coluna nullable via A5). Só storage_path. O getPublicUrl
  // serve apenas ao valor de retorno de conveniência — não é persistido nem contrato de leitura.
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const photoUrl = pub.publicUrl;

  const { data, error } = await supabase
    .from("progress_photos")
    .insert({ patient_id: patientId, storage_path: path, captured_in_app: true, pose })
    .select("*")
    .single();
  if (error) throw error;

  return { url: photoUrl, row: data as ProgressPhotoRow };
}

/**
 * Todas as fotos de evolução do paciente, em ordem cronológica (taken_at asc). Usada no bloco
 * "Fotos evolutivas" do Progresso (grade + comparar). Vazio quando não há paciente/fotos.
 */
export async function getMyProgressPhotos(): Promise<ProgressPhotoWithUrl[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("patient_id", patientId)
    .order("taken_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as ProgressPhotoRow[];
  // Enriquece cada foto com a display_url (signed URL / fallback legado). Gerada no fetch e
  // consumida imediatamente — não persistir/cachear além do TTL (ver query em Progress.tsx).
  return Promise.all(
    rows.map(async (p) => ({ ...p, display_url: await resolveProgressPhotoDisplayUrl(p) })),
  );
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
