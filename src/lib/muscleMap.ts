// Translates the training muscle vocabulary (PT, from workoutData.ts / DB plan)
// into the canonical muscle keys the web BodyMap paints. See CONTRATO_INTEGRACAO.md.
import { workoutSchedule } from "@/data/workoutData";
import type { CanonicalMuscle } from "@/lib/api/types";

export const CANONICAL_MUSCLES: readonly CanonicalMuscle[] = [
  "chest", "biceps", "triceps", "lats", "shoulders", "abs", "forearms",
  "quadriceps", "hamstrings", "glutes", "calves", "traps", "lower_back",
];

// Combining diacritical marks (U+0300..U+036F) built from a string to avoid
// embedding literal accent characters in source.
const ACCENT_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(s: string): string {
  return s.normalize("NFD").replace(ACCENT_MARKS, "").toLowerCase().trim();
}

// Ordered rules - FIRST match wins. Order matters: "deltoide/ombro" is checked
// BEFORE "posterior" so "Deltoide posterior" -> shoulders (not hamstrings).
const RULES: { match: string[]; keys: CanonicalMuscle[] }[] = [
  { match: ["pernas"], keys: ["quadriceps", "hamstrings", "glutes", "calves"] }, // umbrella
  { match: ["deltoide", "ombro"], keys: ["shoulders"] }, // BEFORE "posterior"
  { match: ["peito"], keys: ["chest"] }, // peitoral, peitoral superior
  { match: ["triceps"], keys: ["triceps"] },
  { match: ["biceps", "braquial"], keys: ["biceps"] },
  { match: ["dorsa", "costas", "romboide"], keys: ["lats"] }, // dorsais, romboides
  { match: ["trapezio"], keys: ["traps"] },
  { match: ["antebraco"], keys: ["forearms"] },
  { match: ["quadriceps"], keys: ["quadriceps"] },
  { match: ["posterior", "isquio", "femoral"], keys: ["hamstrings"] }, // posterior de coxa, posteriores
  { match: ["gluteo"], keys: ["glutes"] }, // gluteos, gluteo medio
  { match: ["panturrilha", "soleo", "gastrocnemio"], keys: ["calves"] },
  { match: ["lombar"], keys: ["lower_back"] },
  { match: ["abdomen", "abdominal", "core"], keys: ["abs"] },
];

/**
 * Translate a training-vocabulary (PT) muscle token to canonical key(s).
 * Returns [] (and warns in DEV) for unmapped tokens - never invents a key, never
 * silently loses a known one.
 */
export function translatePtMuscle(ptMuscle: string): CanonicalMuscle[] {
  const n = normalize(ptMuscle);
  for (const rule of RULES) {
    if (rule.match.some((m) => n.includes(m))) return rule.keys;
  }
  if (import.meta.env.DEV) {
    console.warn(
      `[VERTEXA muscleMap] unmapped muscle token: "${ptMuscle}" (normalized "${n}") - skipped`
    );
  }
  return [];
}

function tokensToCanonical(ptTokens: string[]): CanonicalMuscle[] {
  const set = new Set<CanonicalMuscle>();
  for (const mg of ptTokens) {
    for (const key of translatePtMuscle(mg)) set.add(key);
  }
  return [...set];
}

// 4c-3b: registry of REAL workout id -> its PT muscle tokens, populated when the real
// plan loads (api/workouts.getMyWorkoutPlan). Lets the recovery loop resolve real workout
// ids without touching eventSync/recovery. Mock workout ids still resolve via workoutData.
const realWorkoutMuscles = new Map<string, string[]>();

export function registerWorkoutMuscles(workoutId: string, ptMuscleTokens: string[]): void {
  realWorkoutMuscles.set(workoutId, ptMuscleTokens);
}

/**
 * Canonical muscles trained by a workout = union of its exercises' muscle groups,
 * translated and de-duplicated. Resolves a REAL workout id first (registered from the
 * loaded plan), then falls back to the mock workoutData by id.
 */
export function musclesForWorkout(workoutId: string): CanonicalMuscle[] {
  const real = realWorkoutMuscles.get(workoutId);
  if (real) return tokensToCanonical(real);

  const workout = workoutSchedule.find((w) => w.id === workoutId);
  if (!workout) {
    if (import.meta.env.DEV) {
      console.warn(`[VERTEXA muscleMap] unknown workoutId: "${workoutId}"`);
    }
    return [];
  }
  return tokensToCanonical(workout.exercises.flatMap((ex) => ex.muscleGroups));
}