import { supabase } from "@/lib/supabase";

/** Tutorial em vídeo do primeiro acesso (cartão 1087). O vídeo é enviado pelo admin da plataforma na web. */
const TUTORIAL_BUCKET = "onboarding-tutorials";

export interface MyOnboardingTutorial {
  title: string;
  videoUrl: string;
  /** true quando o paciente ainda não viu este tutorial (primeiro acesso). */
  pending: boolean;
}

interface Row {
  title: string | null;
  video_path: string | null;
  pending: boolean | null;
}

export async function getMyPatientTutorial(): Promise<MyOnboardingTutorial | null> {
  const { data, error } = await supabase.rpc("get_my_onboarding_tutorial", { p_audience: "patient" });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  if (!row?.video_path) return null;
  return {
    title: row.title ?? "",
    videoUrl: supabase.storage.from(TUTORIAL_BUCKET).getPublicUrl(row.video_path).data.publicUrl,
    pending: row.pending === true,
  };
}

export async function markPatientTutorialSeen(): Promise<void> {
  const { error } = await supabase.rpc("mark_onboarding_tutorial_seen", { p_audience: "patient" });
  if (error) throw error;
}
