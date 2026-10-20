import { supabase } from "@/lib/supabase";
import { localDateKey } from "@/lib/pendingLogic";
import { getMyPatientId } from "./patient";

/**
 * Camada de dados de suplementação (S3). A LISTA (supplements) é autoria do profissional/web —
 * o app só LÊ (hoje vem do seed; o editor no web é dívida registrada). O app grava AQUI o
 * VALOR/ESTADO "tomado hoje" (supplement_intakes; toggle idempotente por dia via
 * unique(patient_id, supplement_id, taken_on)). O MARCADOR de timeline vive em
 * activity_events(type='supplement_checked', payload={supplement_id}) — disparado pelo
 * tracker/eventSync, NÃO por este módulo. patient_id é sempre patients.id. taken_on = data
 * LOCAL do paciente (localDateKey). Espelha o padrão canônico de meals.ts (S13).
 */

// Espelha as colunas de supplements (migration 20260702140000_supplements.sql).
export interface SupplementRow {
  id: string;
  patient_id: string;
  name: string;
  dose: string | null;
  time_label: string | null;
  order_index: number;
  created_at: string;
  /** 'supplement' (padrão) | 'medication' (migration 20261024090000). Linhas antigas vêm como 'supplement'. */
  kind: "supplement" | "medication";
  brand: string | null;
  notes: string | null;
  /** hora do lembrete ("HH:MM:SS") ou null. */
  reminder_time: string | null;
}

/**
 * Lista de suplementos do paciente (autoria web), ordenada por order_index.
 * Vazio quando não há paciente resolvido ou lista não publicada — NUNCA mock.
 */
export async function getMySupplements(): Promise<SupplementRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data, error } = await supabase
    .from("supplements")
    .select("*")
    .eq("patient_id", patientId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SupplementRow[];
}

export interface ToggleSupplementTakenInput {
  supplementId: string;
  on: boolean; // true = marcar (insert idempotente); false = desmarcar (delete do dia)
}

/**
 * Alterna a marca "tomado" de um suplemento no DIA de hoje (fuso local).
 * - on=true  -> upsert idempotente (ignora conflito da unique (patient_id, supplement_id, taken_on)).
 * - on=false -> delete da linha de hoje.
 * NÃO grava activity_events aqui (o marcador de timeline é responsabilidade do eventSync).
 */
export async function toggleSupplementTaken({ supplementId, on }: ToggleSupplementTakenInput): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");
  const takenOn = localDateKey(new Date());

  if (on) {
    const { error } = await supabase
      .from("supplement_intakes")
      .upsert(
        { patient_id: patientId, supplement_id: supplementId, taken_on: takenOn, source: "app" },
        { onConflict: "patient_id,supplement_id,taken_on", ignoreDuplicates: true }
      );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("supplement_intakes")
    .delete()
    .eq("patient_id", patientId)
    .eq("supplement_id", supplementId)
    .eq("taken_on", takenOn);
  if (error) throw error;
}

/**
 * Conjunto dos supplements.id marcados como tomados HOJE (fuso local).
 * Retorna Set vazio quando não há paciente resolvido.
 */
export async function getSupplementsTakenToday(): Promise<Set<string>> {
  const patientId = await getMyPatientId();
  if (!patientId) return new Set();
  const takenOn = localDateKey(new Date());

  const { data, error } = await supabase
    .from("supplement_intakes")
    .select("supplement_id")
    .eq("patient_id", patientId)
    .eq("taken_on", takenOn);
  if (error) throw error;

  return new Set((data ?? []).map((r) => (r as { supplement_id: string }).supplement_id));
}

export interface SupplementAdherence {
  taken: number; // suplementos da lista tomados hoje
  total: number; // nº de suplementos da lista (0 quando não há lista)
}

/**
 * Adesão a suplementos de HOJE: { taken, total }. total = nº de suplementos da lista (web-authored);
 * taken = quantos foram marcados hoje. Interseção com os ids da lista para não contar intakes
 * órfãos de itens removidos. Sem lista -> { taken: 0, total: 0 } (sem efeito no VRI).
 */
export async function getSupplementAdherenceToday(): Promise<SupplementAdherence> {
  const [list, takenToday] = await Promise.all([getMySupplements(), getSupplementsTakenToday()]);
  const listIds = new Set(list.map((s) => s.id));
  let taken = 0;
  for (const id of takenToday) if (listIds.has(id)) taken++;
  return { taken, total: listIds.size };
}
