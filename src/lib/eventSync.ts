// Event sink: mirrors relevant eventTracker events into Supabase activity_events,
// updates muscle_recovery_states (4c-2) and writes an adherence snapshot (4c-2b)
// when a workout is completed. The eventTracker and all ~15 call sites stay untouched.
import { tracker } from "@/lib/eventTracker";
import type { EventType } from "@/lib/eventTracker";
import { getAdherenceState } from "@/lib/adherenceEngine";
import {
  getMyPatientId,
  logActivityEvent,
  upsertMuscleRecovery,
  insertAdherenceSnapshot,
} from "@/lib/api";
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
let adherenceWritten = false; // 4c-2b: write at most once per session

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

    // A COMPLETED workout (from WorkoutGuide, which carries workoutId) drives muscle
    // recovery (4c-2) and an adherence snapshot (4c-2b). The Records check-in
    // ({source:'records'}) has no workoutId/action -> intentionally ignored.
    const payload = event.payload;
    if (
      event.type === "workout_checked" &&
      payload?.action === "completed" &&
      typeof payload?.workoutId === "string"
    ) {
      void updateMuscleRecovery(payload.workoutId);
      void updateAdherence();
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

async function updateAdherence(): Promise<void> {
  if (adherenceWritten) return; // dedup: at most once per session
  try {
    const patientId = await getMyPatientId();
    if (!patientId) return;
    const state = getAdherenceState();
    await insertAdherenceSnapshot({ patientId, state });
    adherenceWritten = true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] failed to write adherence snapshot", err);
    }
  }
}