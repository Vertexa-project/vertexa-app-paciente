import { supabase } from "@/lib/supabase";
import { getMyPatientId } from "./patient";

// Camada de dados das CONQUISTAS (S5). O catálogo (achievements) é GLOBAL/read-only (seed da
// migration 20260702210746). WP-RLS2: os unlocks (patient_achievements) são escritos SOMENTE pelo
// motor SERVER-SIDE (RPC recompute_achievements), NUNCA pelo app — o app só LÊ. patient_id é
// sempre patients.id.

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
