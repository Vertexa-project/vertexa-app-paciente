import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

/**
 * Camada de dados de "atividade complementar" (activity_sessions). A tela /log-activity grava AQUI
 * o VALOR (modalidade, duração, calorias, origem). O MARCADOR de timeline vive em
 * activity_events(type='activity_logged', payload={modality,duration_min,calories,source}) — disparado
 * pelo tracker/eventSync, NÃO por este módulo. patient_id é sempre patients.id. Mesmo padrão canônico
 * de weight_logs/meal_logs (CONTRATO_INTEGRACAO.md — Spine de dados).
 */

// Espelha as colunas de activity_sessions (migration 20260702120000_activity_sessions.sql).
export interface ActivitySessionRow {
  id: string;
  patient_id: string;
  modality: string;
  duration_min: number;
  calories: number | null;
  source: string;
  performed_at: string;
  created_at: string;
}

export interface LogActivitySessionInput {
  modality: string; // slug canônico (ver src/lib/activityModalities.ts)
  durationMin: number;
  calories?: number | null;
  source?: "manual" | "device"; // default 'manual'; 'device' persistido (cosmético por ora)
  performedAt?: string; // default: agora (coluna default now())
}

/**
 * Persiste o VALOR de uma atividade complementar em activity_sessions (source default 'manual').
 * patient_id é resolvido para patients.id. Progresso LÊ daqui; o VRI reage pelo MARCADOR
 * activity_events(activity_logged) espelhado no eventSync (fator aditivo/não-negativo).
 */
export async function logActivitySession({
  modality,
  durationMin,
  calories,
  source,
  performedAt,
}: LogActivitySessionInput): Promise<ActivitySessionRow> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");

  const row: Record<string, unknown> = {
    patient_id: patientId,
    modality,
    duration_min: durationMin,
    source: source ?? "manual",
  };
  if (calories != null) row.calories = calories;
  if (performedAt) row.performed_at = performedAt;

  const { data, error } = await supabase
    .from("activity_sessions")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as ActivitySessionRow;
}

/**
 * Atividades complementares mais recentes (ordem decrescente por performed_at, com LIMIT).
 * Acessor genérico da camada de dados (parte do contrato #S1: log/getRecent/getSince). Para o
 * SOMATÓRIO/lista da semana no Progresso use getActivitySessionsSince (week-scoped, sem cap que
 * subconte). Vazio quando não há paciente resolvido.
 */
export async function getRecentActivitySessions(limit = 10): Promise<ActivitySessionRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data, error } = await supabase
    .from("activity_sessions")
    .select("*")
    .eq("patient_id", patientId)
    .order("performed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivitySessionRow[];
}

/**
 * Atividades complementares com performed_at >= `since` (Date ou ISO), SEM LIMIT. Fonte week-scoped
 * do bloco "Atividades complementares" do Progresso (lista + soma de tempo/calorias da semana) e base
 * p/ agregados de constância — não subconta quando há muitas sessões na janela. Vazio quando não há
 * paciente resolvido.
 */
export async function getActivitySessionsSince(since: Date | string): Promise<ActivitySessionRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const sinceIso = typeof since === "string" ? since : since.toISOString();
  const { data, error } = await supabase
    .from("activity_sessions")
    .select("*")
    .eq("patient_id", patientId)
    .gte("performed_at", sinceIso)
    .order("performed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActivitySessionRow[];
}
