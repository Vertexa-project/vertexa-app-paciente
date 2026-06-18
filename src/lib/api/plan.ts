import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

// A meal shaped like the mock mealPlan entries the Plan screen already renders.
export interface MealView {
  time: string;
  name: string;
  items: string[];
  calories: number | null;
  done: boolean;
}

export interface NutritionPlanView {
  title: string;
  status: string;
  meals: MealView[];
}

interface RawMeal {
  time: string | null;
  name: string | null;
  items: string[] | null;
  calories: number | null;
  order_index: number | null;
}

/**
 * Real nutrition plan for the current patient (most recent), with meals ordered by
 * order_index. Returns null when there is no plan so the screen can fall back to mock.
 * Read-only: the web writes nutrition_plans/meals; the app only reads them. No "done"
 * column in the schema -> done is always false.
 */
export async function getMyNutritionPlan(): Promise<NutritionPlanView | null> {
  const patientId = await getMyPatientId();
  if (!patientId) return null;

  const { data: plan, error: planError } = await supabase
    .from("nutrition_plans")
    .select("id, title, status")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return null;

  const { data, error } = await supabase
    .from("meals")
    .select("time, name, items, calories, order_index")
    .eq("nutrition_plan_id", plan.id)
    .order("order_index", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as RawMeal[];
  const meals: MealView[] = rows.map((m) => ({
    time: m.time ?? "",
    name: m.name ?? "",
    items: m.items ?? [],
    calories: m.calories,
    done: false,
  }));

  return { title: plan.title ?? "", status: plan.status ?? "", meals };
}