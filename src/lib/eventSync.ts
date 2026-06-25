// Event sink: mirrors relevant eventTracker events into Supabase activity_events,
// updates muscle_recovery_states (4c-2) and writes an adherence snapshot (4c-2b / VRI de
// dados reais) when a relevant action is persisted. The eventTracker and its call sites
// stay untouched.
import { tracker } from "@/lib/eventTracker";
import type { AppEvent, EventType } from "@/lib/eventTracker";
import {
  getMyPatientId,
  logActivityEvent,
  upsertMuscleRecovery,
  insertAdherenceSnapshot,
  computeAdherenceFromActivity,
  getLatestAdherenceState,
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

/**
 * Starts mirroring relevant events. Call once at boot. Uses tracker.onEvent, which
 * only delivers events fired AFTER this point - old in-memory events are never replayed.
 */
export function startEventSync(): void {
  if (started) return;
  started = true;
  tracker.onEvent((event) => {
    void handleEvent(event);
  });
}

/**
 * Persiste o evento e, se ele de fato entrou no banco, atualiza o estado derivado:
 * - conclusão de treino COM workoutId (WorkoutGuide OU Records, objetivo #5) -> recuperação muscular (4c-2);
 * - QUALQUER ação relevante persistida -> recomputa o VRI de dados REAIS e grava um snapshot (objetivo #7).
 * O VRI só é recomputado se o mirror confirmou a escrita, para não persistir um VRI calculado
 * sem o evento que acabou de acontecer.
 */
async function handleEvent(event: AppEvent): Promise<void> {
  if (!RELEVANT_EVENT_TYPES.has(event.type)) return;

  const persisted = await mirror(event.type, event.payload);
  if (!persisted) return;

  const payload = event.payload;
  if (
    event.type === "workout_checked" &&
    payload?.action === "completed" &&
    typeof payload?.workoutId === "string"
  ) {
    await updateMuscleRecovery(payload.workoutId);
  }

  await updateAdherence();
}

/** Espelha o evento em activity_events. Retorna true se a linha foi gravada. */
async function mirror(type: EventType, payload?: Record<string, unknown>): Promise<boolean> {
  try {
    const patientId = await getMyPatientId();
    if (!patientId) return false;
    await logActivityEvent({ patientId, type, payload: payload ?? null });
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] failed to persist event", type, err);
    }
    return false;
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

/**
 * Recomputa o VRI a partir de dados reais e grava um snapshot novo (a web/app leem o último).
 * Sem dedup por sessão (cada ação real pode mudar o VRI), mas evita gravar snapshots IDÊNTICOS
 * consecutivos (ex.: ações que não movem o score saturado) comparando com o último persistido.
 */
async function updateAdherence(): Promise<void> {
  try {
    const patientId = await getMyPatientId();
    if (!patientId) return;
    const state = await computeAdherenceFromActivity();
    const last = await getLatestAdherenceState();
    if (last && last.score === state.score && last.level === state.level) return;
    await insertAdherenceSnapshot({ patientId, state });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] failed to write adherence snapshot", err);
    }
  }
}
