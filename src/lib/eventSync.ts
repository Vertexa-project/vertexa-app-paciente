// Event sink: espelha eventos relevantes do eventTracker em activity_events (o BRUTO) e DISPARA o
// recálculo server-side das métricas DERIVADAS (WP-RLS2): VRI e conquistas via RPC; recuperação
// muscular via TRIGGER no próprio evento bruto (sem chamada do app). O app NÃO calcula nem grava as
// 3 tabelas de métricas (lockdown) — só grava o BRUTO e LÊ o resultado. eventTracker intocado.
import { toast } from "sonner";
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
  "workout_effort", // esforço percebido 1–10: informação para a equipe (catálogo: não conta como adesão)
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

// ── WP-METRIC-1b item 2: a recusa do INSERT deixa de ser silenciosa ────────────────────────
//
// Até aqui, `mirror` engolia QUALQUER falha (só `console.error` em DEV) e `handleEvent` saía
// pela porta dos fundos. A ação da paciente sumia sem sinal. Isso deixou de ser hipótese: a
// migration 20260807090000 pôs uma CHAVE ESTRANGEIRA em `activity_events.type` → o dia em que
// alguém acrescentar um tipo à allow-list acima sem semeá-lo no catálogo `activity_event_types`,
// o insert volta 23503 e, sem o aviso abaixo, ninguém fica sabendo. (Hoje os 10 tipos da
// allow-list estão todos no catálogo, então a FK não dispara — a rede é para o futuro.)
//
// ⚠️ O AVISO É SÓ PARA OS TIPOS ABAIXO, E ISSO É DELIBERADO.
// Para weight_logged, progress_photo_uploaded, meal_logged, supplement_checked, activity_logged
// e help_requested o dado REAL da paciente já foi gravado na tabela canônica pela mutação da
// própria tela (weight_logs, progress_photos, meal_logs, supplement_intakes, activity_sessions,
// chat_messages), cada uma com `onError` visível — o insert aqui é MARCADOR de timeline, e
// perdê-lo NÃO perde o registro dela. Avisar "não foi possível registrar seu peso" logo depois
// de o peso ter sido salvo seria trocar um silêncio por uma mentira na direção oposta.
// Para os dois tipos abaixo NÃO existe tabela canônica: a linha de `activity_events` É o
// registro. Se ela não entra, a ação da paciente se perdeu — e é isso que o aviso diz.
const SOLE_RECORD_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "mood_logged",
  "workout_checked",
]);

const NOT_PERSISTED_LABEL: Partial<Record<EventType, string>> = {
  mood_logged: "seu humor",
  workout_checked: "seu treino",
};

function warnNotPersisted(type: EventType): void {
  if (!SOLE_RECORD_EVENT_TYPES.has(type)) return;
  toast.error(`Não foi possível registrar ${NOT_PERSISTED_LABEL[type] ?? "seu registro"}.`, {
    description: "Nada foi perdido do que já estava salvo. Tente de novo em instantes.",
  });
}

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
  // Esforço percebido não muda VRI nem conquistas: sem recálculo.
  if (event.type === "workout_effort") return;

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
    // Sem paciente resolvido não há o que gravar e não há falha a reportar: é o caminho de
    // sessão sem identidade (pré-login), não uma recusa do banco. Avisar aqui encheria
    // a tela de erro a cada toque. Silêncio proposital, e SÓ aqui.
    if (!patientId) return false;
    await logActivityEvent({ patientId, type, payload: payload ?? null });
    return true;
  } catch (err) {
    // O banco RECUSOU (FK 23503 de tipo fora do catálogo, RLS, rede...). Isto é falha de
    // verdade: a paciente precisa saber quando o registro dela era esta linha.
    warnNotPersisted(type);
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
