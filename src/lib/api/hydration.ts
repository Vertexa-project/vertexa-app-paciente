import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import { sumHydrationLiters } from "@/lib/hydrationMath";

export interface LogHydrationInput {
  liters: number; // INCREMENTO registrado agora (não o total acumulado) — a soma do dia é o total
}

/**
 * Registra um INCREMENTO de hidratação em activity_events(type='hydration_logged') com a chave
 * CANÔNICA payload.liters (CONTRATO #16 — padroniza o drift {amount}/{source} do app).
 * "Água de hoje" = soma dos incrementos do dia (getHydrationTodayLiters / web). Por isso cada
 * registro grava o incremento, não o acumulado — senão a soma do dia contaria em dobro.
 */
export async function logHydration({ liters }: LogHydrationInput): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");

  const { error } = await supabase.from("activity_events").insert({
    patient_id: patientId,
    type: "hydration_logged",
    payload: { liters },
  });
  if (error) throw error;
}

/**
 * Litros de água registrados HOJE = soma de activity_events(hydration_logged).payload.liters
 * com created_at >= início do dia local. Mesma regra que a web (api/hydration.ts).
 */
export async function getHydrationTodayLiters(): Promise<number> {
  const patientId = await getMyPatientId();
  if (!patientId) return 0;

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("activity_events")
    .select("payload, created_at")
    .eq("patient_id", patientId)
    .eq("type", "hydration_logged")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  return sumHydrationLiters((data ?? []) as { payload: Record<string, unknown> | null }[]);
}
