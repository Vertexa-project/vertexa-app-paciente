import { supabase } from "@/lib/supabase";
import { captureException } from "@/lib/observability/sentry";

/** Adiciona senha à sessão atual. Nunca signUp. Nunca envia autoridade. */
export async function createPasswordForCurrentUser(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    captureException(error, { source: "auth", scope: "create-password" });
    throw error;
  }
  await supabase.auth.getUser();
  return data.user;
}
