import { supabase } from "@/lib/supabase";
import { getMyPatientId, getPatient } from "./patient";
import {
  evaluateAchievements,
  deriveStreak,
  countWorkoutDays,
  type AchievementCode,
  type AchievementFacts,
} from "@/lib/achievementsEngine";

// Camada de dados das CONQUISTAS (S5). O catálogo (achievements) é GLOBAL/read-only (seed da
// migration 20260702210746); os unlocks (patient_achievements) são escritos PELO MOTOR
// (computeAndPersistAchievements), NUNCA por INSERT manual. patient_id é sempre patients.id.
//
// ISOLAMENTO DO VRI: este módulo NÃO importa nem chama o adherenceEngine/adherence.ts e NÃO
// escreve em adherence_snapshots. Lê os MESMOS dados reais, mas grava só em patient_achievements.

export type AchievementCategory = "first_step" | "streak" | "weight";

// Espelha as colunas de achievements (catálogo global).
export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  sort_order: number;
}

// Uma linha de unlock do paciente (patient_achievements).
export interface PatientAchievementRow {
  achievement_code: string;
  unlocked_at: string;
}

// Item do catálogo + estado de unlock do paciente — forma que a UI consome.
export interface AchievementView extends AchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
}

/** Catálogo completo (12 conquistas), na ordem de exibição (sort_order). Global (sem patient_id). */
export async function getAchievementsCatalog(): Promise<AchievementDef[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("code, title, description, icon, category, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AchievementDef[];
}

/** Unlocks do paciente atual, mais recente primeiro. Vazio quando não há paciente resolvido. */
export async function getPatientAchievements(): Promise<PatientAchievementRow[]> {
  const patientId = await getMyPatientId();
  if (!patientId) return [];

  const { data, error } = await supabase
    .from("patient_achievements")
    .select("achievement_code, unlocked_at")
    .eq("patient_id", patientId)
    .order("unlocked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PatientAchievementRow[];
}

/**
 * Catálogo + estado de unlock combinados, na ordem do catálogo. Fonte da tela /achievements e do
 * card "Conquistas recentes" (a UI filtra unlocked + ordena por unlockedAt). Só leitura.
 */
export async function getAchievementsView(): Promise<AchievementView[]> {
  const [catalog, unlocks] = await Promise.all([getAchievementsCatalog(), getPatientAchievements()]);
  const unlockedAtByCode = new Map(unlocks.map((u) => [u.achievement_code, u.unlocked_at]));
  return catalog.map((def) => ({
    ...def,
    unlocked: unlockedAtByCode.has(def.code),
    unlockedAt: unlockedAtByCode.get(def.code) ?? null,
  }));
}

/**
 * Monta os fatos reais que decidem os unlocks (peso do banco = D2; streak/treino de
 * activity_events; flags de existência das tabelas-valor). Retorna null sem paciente resolvido.
 */
async function gatherAchievementFacts(patientId: string): Promise<AchievementFacts> {
  const [patient, eventsRes, weightRes, photoRes, mealRes, activityRes, supplementRes] = await Promise.all([
    getPatient(),
    supabase
      .from("activity_events")
      .select("type, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("weight_logs").select("id").eq("patient_id", patientId).limit(1),
    supabase.from("progress_photos").select("id").eq("patient_id", patientId).limit(1),
    supabase.from("meal_logs").select("id").eq("patient_id", patientId).limit(1),
    supabase.from("activity_sessions").select("id").eq("patient_id", patientId).limit(1),
    supabase.from("supplement_intakes").select("id").eq("patient_id", patientId).limit(1),
  ]);
  if (eventsRes.error) throw eventsRes.error;
  if (weightRes.error) throw weightRes.error;
  if (photoRes.error) throw photoRes.error;
  if (mealRes.error) throw mealRes.error;
  if (activityRes.error) throw activityRes.error;
  if (supplementRes.error) throw supplementRes.error;

  const events = (eventsRes.data ?? []) as { type: string; created_at: string }[];
  const now = new Date();

  const start = patient?.start_weight ?? null;
  const current = patient?.current_weight ?? null;
  const target = patient?.target_weight ?? null;
  // kg eliminados = start - current, lido do banco (D2). Clamp >= 0 (ganho de peso não "destrava").
  const kgLost = start != null && current != null ? Math.max(0, start - current) : 0;
  const reachedTarget = current != null && target != null ? current <= target : false;

  return {
    workoutDays: countWorkoutDays(events),
    hasWeightLog: (weightRes.data?.length ?? 0) > 0,
    hasPhoto: (photoRes.data?.length ?? 0) > 0,
    hasMealLog: (mealRes.data?.length ?? 0) > 0,
    hasActivitySession: (activityRes.data?.length ?? 0) > 0,
    hasSupplementIntake: (supplementRes.data?.length ?? 0) > 0,
    streak: deriveStreak(events, now),
    kgLost,
    reachedTarget,
  };
}

export interface ComputeAchievementsResult {
  unlocked: AchievementCode[]; // todas as conquistas atualmente destravadas (pelo motor)
  newlyUnlocked: AchievementCode[]; // as que ainda NÃO existiam em patient_achievements
}

/**
 * MOTOR de persistência das conquistas: deriva os fatos reais, avalia o catálogo e faz UPSERT
 * (ON CONFLICT DO NOTHING) das destravadas em patient_achievements. Idempotente e monotônico —
 * conquistas já ganhas mantêm a 1ª data (o upsert com ignoreDuplicates não sobrescreve).
 * É o que o eventSync chama a cada ação relevante e o que faz o unlock RETROATIVO (S5/STEP 4),
 * SEMPRE via motor — nunca INSERT manual. NÃO toca o VRI.
 */
export async function computeAndPersistAchievements(): Promise<ComputeAchievementsResult> {
  const patientId = await getMyPatientId();
  if (!patientId) return { unlocked: [], newlyUnlocked: [] };

  const facts = await gatherAchievementFacts(patientId);
  const unlocked = evaluateAchievements(facts);
  if (unlocked.length === 0) return { unlocked, newlyUnlocked: [] };

  // Quais já existiam (para reportar as NOVAS a quem quiser dar feedback de "nova conquista").
  const { data: existingData, error: existingError } = await supabase
    .from("patient_achievements")
    .select("achievement_code")
    .eq("patient_id", patientId);
  if (existingError) throw existingError;
  const existing = new Set((existingData ?? []).map((r) => (r as { achievement_code: string }).achievement_code));
  const newlyUnlocked = unlocked.filter((code) => !existing.has(code));

  const rows = unlocked.map((code) => ({
    patient_id: patientId,
    achievement_code: code,
    source: "engine",
  }));
  const { error: upsertError } = await supabase
    .from("patient_achievements")
    .upsert(rows, { onConflict: "patient_id,achievement_code", ignoreDuplicates: true });
  if (upsertError) throw upsertError;

  return { unlocked, newlyUnlocked };
}
