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
 * Registra qual opção da refeição o paciente usou hoje (PDF do Ernâni, tela 19: "Usar opção registra a troca").
 * Usar uma opção marca a refeição como feita. optionIndex 1 = a refeição original (grava NULL).
 * meal_logs não tem UPDATE para o paciente: trocar de opção = apagar a linha de hoje e inserir de novo.
 */
export async function registerMealOption({ mealId, optionIndex }: { mealId: string; optionIndex: number }): Promise<void> {
  const patientId = await getMyPatientId();
  if (!patientId) throw new Error("Paciente não resolvido (patient_id ausente)");
  const consumedOn = localDateKey(new Date());
  const { error: delError } = await supabase.from("meal_logs").delete().eq("patient_id", patientId).eq("meal_id", mealId).eq("consumed_on", consumedOn);
  if (delError) throw delError;
  const { error } = await supabase.from("meal_logs").insert({
    patient_id: patientId, meal_id: mealId, consumed_on: consumedOn, source: "app",
    option_index: optionIndex > 1 ? optionIndex : null,
  });
  if (error) throw error;
}

/** Opção usada HOJE por refeição (só as que usaram uma alternativa; ausente = original). */
export async function getMealOptionsToday(): Promise<Record<string, number>> {
  const patientId = await getMyPatientId();
  if (!patientId) return {};
  const { data, error } = await supabase.from("meal_logs").select("meal_id, option_index").eq("patient_id", patientId).eq("consumed_on", localDateKey(new Date())).not("option_index", "is", null);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { meal_id: string; option_index: number }[]) out[r.meal_id] = r.option_index;
  return out;
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

/** Marcas de refeição feitas desde o dia `sinceKey` (yyyy-mm-dd local), só das refeições do plano ativo. */
export async function getMealLogsSince(sinceKey: string): Promise<{ consumed_on: string }[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];
  const plan = await getMyNutritionPlan();
  const planIds = new Set((plan?.meals ?? []).map((m) => m.id).filter(Boolean));
  if (planIds.size === 0) return [];
  const { data, error } = await supabase
    .from("meal_logs")
    .select("meal_id, consumed_on")
    .eq("patient_id", patientId)
    .gte("consumed_on", sinceKey);
  if (error) throw error;
  return ((data ?? []) as { meal_id: string; consumed_on: string }[])
    .filter((r) => planIds.has(r.meal_id))
    .map((r) => ({ consumed_on: r.consumed_on }));
}
