// Event sink: mirrors relevant eventTracker events into Supabase activity_events.
// The eventTracker and all ~15 call sites stay untouched — we only listen.
import { tracker } from "@/lib/eventTracker";
import type { EventType } from "@/lib/eventTracker";
import { getMyPatientId, logActivityEvent } from "@/lib/api";

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
 * Starts mirroring relevant events to activity_events. Call once at boot.
 * Uses tracker.onEvent, which only delivers events fired AFTER this point —
 * so old in-memory events are never re-emitted/duplicated on boot.
 */
export function startEventSync(): void {
  if (started) return;
  started = true;

  tracker.onEvent((event) => {
    if (!RELEVANT_EVENT_TYPES.has(event.type)) return;
    void mirror(event.type, event.payload);
  });
}

async function mirror(type: EventType, payload?: Record<string, unknown>): Promise<void> {
  try {
    const patientId = await getMyPatientId();
    if (!patientId) return;
    await logActivityEvent({ patientId, type, payload: payload ?? null });
  } catch (err) {
    // Never break the app over analytics; surface only in dev (no sensitive logs in prod).
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] failed to persist event", type, err);
    }
  }
}