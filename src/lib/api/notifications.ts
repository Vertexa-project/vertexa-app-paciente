import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

// Notificações do paciente (S6). A LISTA nasce de seed/migration (dívida: emissor no web);
// o app só LÊ e marca como lida (read_at). patient_id é sempre patients.id. Espelha o padrão
// canônico de meals/supplements. NÃO toca o VRI.
export type NotificationType =
  | "reminder"
  | "motivation"
  | "achievement"
  | "professional"
  | "retention"
  | "system";

// Espelha as colunas de notifications (migration 20260702220402_notifications.sql).
export interface NotificationRow {
  id: string;
  patient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null; // null = não lida (badge)
  created_at: string;
}

/** Notificações do paciente atual, mais recente primeiro. Vazio sem paciente resolvido. */
export async function getMyNotifications(): Promise<NotificationRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

/** Nº de notificações NÃO lidas (read_at is null) — fonte do badge. 0 sem paciente resolvido. */
export async function getUnreadCount(): Promise<number> {
  const patientId = await getMyPatientId();
  if (!patientId) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Marca UMA notificação como lida (read_at=agora). Idempotente: só atualiza se ainda não lida
 * (`.is('read_at', null)`), preservando a 1ª data de leitura. patient_id não é necessário (id é PK).
 */
export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

/** Marca TODAS as não lidas do paciente como lidas (zera o badge de uma vez). */
export async function markAllNotificationsRead(): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("patient_id", patientId)
    .is("read_at", null);
  if (error) throw error;
}
