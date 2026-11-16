import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import type { DeliveryRow } from "@/lib/deliveries";
import type { ReminderRow } from "@/lib/reminders";

// Bucket PRIVADO dos documentos do paciente (a clínica envia; o paciente só lê, por URL assinada de vida curta).
const BUCKET = "patient-documents";
const SIGNED_URL_TTL_SECONDS = 600;

interface RawDelivery extends Omit<DeliveryRow, "sender_name"> {
  sender: { profile: { full_name: string | null } | null } | null;
}

/** Documentos que a clínica enviou ao app (mais novos primeiro). A RLS entrega só os do próprio paciente e esconde os retirados. */
export async function getMyDeliveries(): Promise<DeliveryRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];
  const { data, error } = await supabase
    .from("patient_deliveries")
    .select("id, kind, title, file_path, mime_type, file_size_bytes, sent_at, first_opened_at, sender:professionals!patient_deliveries_sent_by_professional_id_fkey ( profile:profiles!professionals_profile_id_fkey ( full_name ) )")
    .eq("patient_id", patientId)
    .order("sent_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as RawDelivery[]).map(({ sender, ...d }) => ({ ...d, sender_name: sender?.profile?.full_name ?? null }));
}

/** URL assinada (10 min) do arquivo; abre/baixa no clique e marca como visto. */
export async function openDelivery(d: Pick<DeliveryRow, "id" | "file_path" | "first_opened_at">): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw error ?? new Error("Não foi possível gerar o link do documento.");
  if (!d.first_opened_at) {
    // Melhor esforço: o "visto" não pode impedir a leitura do documento.
    void supabase.rpc("mark_delivery_opened", { p_delivery_id: d.id });
  }
  return data.signedUrl;
}

/** Lembretes de exame e retorno que a clínica cadastrou para este paciente (abertos). A janela de aviso é decidida em reminders.ts. */
export async function getMyReminders(): Promise<ReminderRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];
  const { data, error } = await supabase
    .from("patient_reminders")
    .select("id, patient_id, kind, title, due_on, notify_patient, notify_days_before, message_template, done_at")
    .eq("patient_id", patientId)
    .eq("notify_patient", true)
    .is("done_at", null)
    .order("due_on", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ReminderRow[];
}
