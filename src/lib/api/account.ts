import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

/** Tudo o que a plataforma guarda sobre a pessoa (JSON). Só a própria paciente. */
export async function exportMyData(): Promise<unknown> {
  const { data, error } = await supabase.rpc("my_data_export");
  if (error) throw error;
  return data;
}

/** Data do pedido de exclusão em aberto, ou null. */
export async function getMyDeletionRequest(): Promise<string | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;
  const { data, error } = await supabase
    .from("account_deletion_requests").select("requested_at").eq("patient_id", patientId).eq("status", "open").maybeSingle();
  if (error) throw error;
  return (data as { requested_at: string } | null)?.requested_at ?? null;
}

export async function requestAccountDeletion(): Promise<void> {
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) throw error;
}

export async function cancelAccountDeletion(): Promise<void> {
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) throw error;
}
