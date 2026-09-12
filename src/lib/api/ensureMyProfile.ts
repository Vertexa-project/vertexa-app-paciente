import { supabase } from "@/lib/supabase";

/** Provisiona/liga public.profiles do chamador. Zero args — só auth.uid(). */
export async function ensureMyProfile(): Promise<void> {
  const { error } = await supabase.rpc("ensure_my_profile");
  if (error) throw error;
}
