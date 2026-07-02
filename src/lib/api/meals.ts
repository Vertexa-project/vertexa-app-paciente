import { supabase } from "@/lib/supabase";
import { localDateKey } from "@/lib/pendingLogic";
import { getMyPatientId } from "./patient";
import { getMyNutritionPlan } from "./plan";

/**
 * Camada de dados de "refeição feita" (meal_logs). A web AUTORA nutrition_plans -> meals; o app
 * grava AQUI o VALOR/ESTADO "refeição consumida hoje". O marcador de timeline vive em
 * activity_events(type='meal_logged', payload={meal_id}) — disparado pelo tracker/eventSync, NÃO
 * por este módulo. patient_id é sempre patients.id. consumed_on = data LOCAL (fuso do paciente).
 */

export interface ToggleMealDoneInput {
  mealId: string;
  on: boolean; // true = marcar (insert idempotente); false = desmarcar (delete do dia)
}

/**
 * Alterna a marca "feita" de uma refeição no DIA de hoje (fuso local).
 * - on=true  -> upsert idempotente (ignora conflito da unique (patient_id, meal_id, consumed_on)).
 * - on=false -> delete da linha de hoje.
 * NÃO grava activity_events aqui (o marcador de timeline é responsabilidade do eventSync).
 */
export async function toggleMealDone({ mealId, on }: ToggleMealDoneInput): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");
  const consumedOn = localDateKey(new Date());

  if (on) {
    const { error } = await supabase
      .from("meal_logs")
      .upsert(
        { patient_id: patientId, meal_id: mealId, consumed_on: consumedOn, source: "app" },
        { onConflict: "patient_id,meal_id,consumed_on", ignoreDuplicates: true }
      );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("meal_logs")
    .delete()
    .eq("patient_id", patientId)
    .eq("meal_id", mealId)
    .eq("consumed_on", consumedOn);
  if (error) throw error;
}

/**
 * Conjunto dos meals.id marcados como feitos HOJE (fuso local) pelo paciente.
 * Retorna Set vazio quando não há paciente resolvido.
 */
export async function getMealsDoneToday(): Promise<Set<string>> {
  const patientId = await getMyPatientId();
  if (!patientId) return new Set();
  const consumedOn = localDateKey(new Date());

  const { data, error } = await supabase
    .from("meal_logs")
    .select("meal_id")
    .eq("patient_id", patientId)
    .eq("consumed_on", consumedOn);
  if (error) throw error;

  return new Set((data ?? []).map((r) => (r as { meal_id: string }).meal_id));
}

export interface MealAdherence {
  done: number; // refeições do plano ativo marcadas hoje
  total: number; // nº de refeições do plano ativo (0 quando não há plano real)
}

/**
 * Adesão alimentar de HOJE: { done, total }. total = nº de meals do plano ativo (real, web-authored);
 * done = quantas dessas foram marcadas hoje. Interseção com os ids do plano para não contar logs
 * órfãos de um plano antigo. Sem plano real -> { done: 0, total: 0 } (a Home cai no mock).
 */
export async function getMealAdherenceToday(): Promise<MealAdherence> {
  const [plan, doneToday] = await Promise.all([getMyNutritionPlan(), getMealsDoneToday()]);
  const planMealIds = new Set((plan?.meals ?? []).map((m) => m.id).filter(Boolean));
  let done = 0;
  for (const id of doneToday) if (planMealIds.has(id)) done++;
  return { done, total: planMealIds.size };
}
