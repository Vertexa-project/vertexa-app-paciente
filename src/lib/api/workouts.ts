import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";
import { registerWorkoutMuscles } from "@/lib/muscleMap";
import { workoutSchedule, type Workout, type ExerciseSet } from "@/data/workoutData";

// GIF fallback: the real seed has gif_url = null. Reuse the mock exercise GIFs by name
// (the seed exercise names match the mock) until the web fills gif_url. PROVISIONAL.
const GIF_BY_NAME = new Map<string, string>();
for (const w of workoutSchedule) {
  for (const ex of w.exercises) GIF_BY_NAME.set(ex.name.trim().toLowerCase(), ex.gifUrl);
}
function gifForName(name: string, gifUrl: string | null): string {
  if (gifUrl) return gifUrl;
  return GIF_BY_NAME.get(name.trim().toLowerCase()) ?? "";
}

const DOW: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

interface RawExercise {
  id: string;
  name: string;
  muscle_groups: string[] | null;
  sets: number | null;
  reps: number | null;
  load_kg: number | string | null;
  rest_seconds: number | null;
  gif_url: string | null;
  notes: string | null;
  order_index: number | null;
}
interface RawWorkout {
  id: string;
  letter: string | null;
  name: string;
  primary_muscle_group: string | null;
  day_index: number | null;
  estimated_minutes: number | null;
  workout_exercises: RawExercise[] | null;
}

function toNum(v: number | string | null): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Real workout plan for the current patient, adapted to the WorkoutGuide `Workout` shape
 * so the rich UI keeps working. Also registers each workout's real muscle tokens (PT) so the
 * 4c-2 recovery loop resolves the REAL workout id (see muscleMap.registerWorkoutMuscles).
 * Returns [] when there is no plan, so the screen can fall back to the mock.
 */
export async function getMyWorkoutPlan(): Promise<Workout[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return [];

  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, letter, name, primary_muscle_group, day_index, estimated_minutes, " +
        "workout_exercises(id, name, muscle_groups, sets, reps, load_kg, rest_seconds, gif_url, notes, order_index)"
    )
    .eq("workout_plan_id", plan.id)
    .order("day_index", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawWorkout[];

  return rows.map((w) => {
    const exercises = [...(w.workout_exercises ?? [])]
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((ex) => {
        const count = Math.max(1, ex.sets ?? 1);
        const sets: ExerciseSet[] = Array.from({ length: count }, () => ({
          reps: ex.reps ?? 0,
          weight: toNum(ex.load_kg),
          completed: false,
        }));
        return {
          id: ex.id,
          name: ex.name,
          muscleGroups: ex.muscle_groups ?? [],
          sets,
          restSeconds: ex.rest_seconds ?? 60,
          gifUrl: gifForName(ex.name, ex.gif_url),
          notes: ex.notes ?? undefined,
        };
      });

    // Register the REAL workout id -> its PT muscle tokens for the recovery loop.
    const ptTokens = exercises.flatMap((e) => e.muscleGroups);
    registerWorkoutMuscles(w.id, ptTokens);

    const minutes = w.estimated_minutes ?? 0;
    return {
      id: w.id,
      letter: w.letter ?? "",
      name: w.name,
      muscleGroup: w.primary_muscle_group ?? "",
      dayOfWeek: DOW[w.day_index ?? -1] ?? "",
      dayIndex: w.day_index ?? 0,
      exercises,
      estimatedMinutes: minutes,
      estimatedCalories: Math.round(minutes * 6), // derived (schema has no calories)
      completed: false,
    } as Workout;
  });
}