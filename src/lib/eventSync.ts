// Event sink: espelha eventos relevantes do eventTracker em activity_events (o BRUTO) e DISPARA o
// recálculo server-side das métricas DERIVADAS (WP-RLS2): VRI e conquistas via RPC; recuperação
// muscular via TRIGGER no próprio evento bruto (sem chamada do app). O app NÃO calcula nem grava as
// 3 tabelas de métricas (lockdown) — só grava o BRUTO e LÊ o resultado. eventTracker intocado.
import { tracker } from "@/lib/eventTracker";
import type { AppEvent, EventType } from "@/lib/eventTracker";
import {
  getMyPatientId,
  logActivityEvent,
  recomputeAdherence,
  recomputeAchievements,
} from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

// EXPLICIT allow-list of patient-action events to persist. Everything else
// (home_viewed, plan_viewed, *_viewed, login_completed, ...) is ignored.
const RELEVANT_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "workout_checked",
  "weight_logged",
  "progress_photo_uploaded",
  "meal_logged",
  "supplement_checked",
  "activity_logged",
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
 * Persiste o evento BRUTO e, se ele entrou no banco, DISPARA o recálculo server-side das métricas:
 * - conclusão de treino => a recuperação muscular já foi recalculada por TRIGGER no INSERT do evento
 *   (activity_events/workout_checked-completed); aqui só invalidamos p/ repintar o body map;
 * - QUALQUER ação relevante persistida => RPC recompute_adherence (VRI de dados reais no servidor);
 * - QUALQUER ação relevante persistida => RPC recompute_achievements (conquistas no servidor).
 * O app NÃO calcula/grava essas 3 tabelas (lockdown) — o valor é derivado do bruto no servidor.
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
    // A recuperação já foi escrita pelo trigger no INSERT do evento acima; só repintar o body map.
    void queryClient.invalidateQueries({ queryKey: ["recovery"] });
  }

  await updateAdherence();
  // Conquistas: caminho SEPARADO do VRI. Um erro aqui não afeta o snapshot de adesão já disparado.
  await updateAchievements();
}

/** Espelha o evento em activity_events (o BRUTO). Retorna true se a linha foi gravada. */
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

/**
 * Dispara o recálculo server-side do VRI (RPC recompute_adherence, que deriva do bruto e faz o
 * skip-if-unchanged no servidor) e invalida a Home. Erro NUNCA quebra o app (no-op silencioso).
 */
async function updateAdherence(): Promise<void> {
  try {
    await recomputeAdherence();
    void queryClient.invalidateQueries({ queryKey: ["adherence"] });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] recompute_adherence failed", err);
    }
  }
}

/**
 * Dispara o recálculo server-side das CONQUISTAS (RPC recompute_achievements, upsert monotônico) e
 * invalida a tela /achievements + card. Erro NUNCA quebra o app.
 */
async function updateAchievements(): Promise<void> {
  try {
    await recomputeAchievements();
    void queryClient.invalidateQueries({ queryKey: ["achievements"] });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[VERTEXA eventSync] recompute_achievements failed", err);
    }
  }
}
