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
  { match: ["posterior", "isquio", "femoral"], keys: ["hamstrings"] }, // posterior de coxa
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

/**
 * Canonical muscles trained by a workout = union of its exercises' muscle groups,
 * translated and de-duplicated. Reads the mock workoutData (4c-3 will read the real plan).
 */
export function musclesForWorkout(workoutId: string): CanonicalMuscle[] {
  const workout = workoutSchedule.find((w) => w.id === workoutId);
  if (!workout) {
    if (import.meta.env.DEV) {
      console.warn(`[VERTEXA muscleMap] unknown workoutId: "${workoutId}"`);
    }
    return [];
  }
  const set = new Set<CanonicalMuscle>();
  for (const ex of workout.exercises) {
    for (const mg of ex.muscleGroups) {
      for (const key of translatePtMuscle(mg)) set.add(key);
    }
  }
  return [...set];
}