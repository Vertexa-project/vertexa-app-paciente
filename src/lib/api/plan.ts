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

interface RawMeal {
  time: string | null;
  name: string | null;
  items: string[] | null;
  calories: number | null;
  order_index: number | null;
}

/**
 * Real meals for the current patient (most recent nutrition plan), ordered.
 * Returns [] when there is no plan/meals so the screen can fall back to mock.
 * The web writes nutrition_plans/meals; the app only reads them.
 */
export async function getMyMeals(): Promise<MealView[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data: plan, error: planError } = await supabase
    .from("nutrition_plans")
    .select("id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return [];

  const { data, error } = await supabase
    .from("meals")
    .select("time, name, items, calories, order_index")
    .eq("nutrition_plan_id", plan.id)
    .order("order_index", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as RawMeal[];
  return rows.map((m) => ({
    time: m.time ?? "",
    name: m.name ?? "",
    items: m.items ?? [],
    calories: m.calories,
    done: false,
  }));
}