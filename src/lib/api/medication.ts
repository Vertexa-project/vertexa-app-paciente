import { supabase } from "@/lib/supabase";
import type { MedToday } from "@/lib/medication";

/** Cartão da aplicação (A3). `enabled: false` quando a clínica não ligou o lembrete. */
export async function getMedToday(): Promise<MedToday> {
  const { data, error } = await supabase.rpc("med_patient_today");
  if (error) throw error;
  return (data ?? { enabled: false }) as MedToday;
}

/** "Já apliquei": grava a aplicação de hoje (dose do tratamento, em casa). O servidor valida o dia e evita duplicar. */
export async function confirmMedApplication(treatmentId?: string): Promise<void> {
  const { error } = await supabase.rpc("med_patient_confirm", { p_treatment: treatmentId ?? null });
  if (error) throw error;
}
