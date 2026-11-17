import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import { progressPhotoExt, progressPhotoStorageKey, validateProgressPhotoFile } from "./photos";
import type { MissionView, RoutineView } from "@/lib/routineCards";

// Fotos de suplementos e bioimpedância vão para o MESMO bucket privado das fotos de evolução (pasta = patient_id, a RLS já existente vale).
const BUCKET = "progress-photos";

/** Rotina efetiva do paciente (padrão da clínica ou exceção) e o que está aberto. Calculada no banco, em Brasília, sobre os registros reais. */
export async function getMyRoutine(): Promise<RoutineView | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;
  const { data, error } = await supabase.rpc("get_patient_routine", { p_patient_id: patientId, p_weeks: 4 });
  if (error) throw error;
  return data as RoutineView;
}

export async function getMyMission(): Promise<MissionView | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;
  const { data, error } = await supabase.rpc("get_patient_mission", { p_patient_id: patientId });
  if (error) throw error;
  return data as MissionView;
}

export type RoutineEntryKind = "feedback" | "supplements_photo" | "bio_photo" | "bio_na";

export async function logRoutineEntry(kind: RoutineEntryKind, note?: string | null, storagePath?: string | null): Promise<void> {
  const { error } = await supabase.rpc("log_my_routine_entry", { p_kind: kind, p_note: note ?? null, p_storage_path: storagePath ?? null });
  if (error) throw error;
}

/** Sobe a foto (suplementos ou bioimpedância) para o bucket privado e registra o passo. Mesmas guardas de tipo/tamanho das fotos de evolução. */
export async function uploadRoutinePhoto(kind: "supplements_photo" | "bio_photo", file: File): Promise<void> {
  validateProgressPhotoFile(file);
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");
  const path = progressPhotoStorageKey(patientId, crypto.randomUUID(), progressPhotoExt(file.type));
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;
  await logRoutineEntry(kind, null, path);
}

export async function markMissionCelebrated(): Promise<void> {
  const { error } = await supabase.rpc("mark_my_mission_celebrated");
  if (error) throw error;
}
