// Event sink: mirrors relevant eventTracker events into Supabase activity_events,
// and (4c-2) updates muscle_recovery_states when a workout is completed.
// The eventTracker and all ~15 call sites stay untouched - we only listen.
import { tracker } from "@/lib/eventTracker";
import type { EventType } from "@/lib/eventTracker";
import { getMyPatientId, logActivityEvent, upsertMuscleRecovery } from "@/lib/api";
import { musclesForWorkout } from "@/lib/muscleMap";

// EXPLICIT allow-list of patient-action events to persist. Everything else
// (home_viewed, plan_viewed, *_viewed, login_completed, ...) is ignored.
const RELEVANT_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "workout_checked",
  "weight_logged",
  "progress_photo_uploaded",
  "hydration_logged",
  "sleep_logged",
  "mood_logged",
  "help_requested",
]);

let started = false;

/**
 * Starts mirroring relevant events. Call once at boot. Uses tracker.onEvent, which
 * only delivers events fired AFTER this point - old in-memory events are never replayed.
 */
export function startEventSync(): void {
  if (started) return;
  started = true;

  tracker.onEvent((event) => {
    if (RELEVANT_EVENT_TYPES.has(event.type)) {
      void mirror(event.type, event.payload);
    }

    // 4c-2: only a COMPLETED workout (from WorkoutGuide, which carries workoutId)
    // drives muscle recovery. The Records check-in ({source:'records'}) has no
    // workoutId/action -> intentionally ignored here.
    const payload = event.payload;
    if (
      event.type === "workout_checked" &&
      payload?.action === "completed" &&
      typeof payload?.workoutId === "string"
    ) {
      void updateMuscleRecovery(payload.workoutId);
    }
  });
}

async function mirror(type: EventType, payload?: Record<string, unknown>): Promise<void> {
  try {
    const patientId = await getMyPatientId();
    if (!patientId) return;
    await logActivityEvent({ patientId, type, payload: payload ?? null });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] failed to persist event", type, err);
    }
  }
}

async function updateMuscleRecovery(workoutId: string): Promise<void> {
  try {
    const patientId = await getMyPatientId();
    if (!patientId) return;
    const muscles = musclesForWorkout(workoutId);
    if (muscles.length === 0) return;
    await upsertMuscleRecovery({ patientId, muscles });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] failed to update muscle recovery", workoutId, err);
    }
  }
}