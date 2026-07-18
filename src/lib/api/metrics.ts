import { supabase } from "@/lib/supabase";

/**
 * WP-RLS2 — métricas DERIVADAS calculadas NO SERVIDOR. O app deixou de CALCULAR/GRAVAR o VRI e as
 * conquistas: apenas DISPARA o recálculo (a partir do bruto que acabou de registrar). O valor é
 * derivado no servidor (RPC SECURITY DEFINER, escopada ao paciente logado) — o paciente NÃO grava
 * essas tabelas (lockdown). A recuperação muscular é recalculada por TRIGGER no evento bruto
 * (activity_events/workout_checked-completed), sem RPC.
 */

/** Dispara o recálculo server-side do VRI (adherence_snapshots) para o paciente logado. */
export async function recomputeAdherence(): Promise<void> {
  const { error } = await supabase.rpc("recompute_adherence");
  if (error) throw error;
}

/** Dispara o recálculo server-side das conquistas (patient_achievements) para o paciente logado. */
export async function recomputeAchievements(): Promise<void> {
  const { error } = await supabase.rpc("recompute_achievements");
  if (error) throw error;
}
