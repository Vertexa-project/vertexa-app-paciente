import { normalizeAvatarPick, type AvatarKind } from "@/lib/avatar/avatarPick";
import { supabase } from "@/lib/supabase";

/** Salva bichinho + cor (RPC set_my_avatar_pick, valida no banco também). Valor fora da lista nem sai do app. */
export async function saveAvatarPick(key: string, bg: string): Promise<void> {
  const pick = normalizeAvatarPick(key, bg);
  if (!pick) throw new Error("Escolha um bichinho e uma cor de fundo da lista.");
  const { error } = await supabase.rpc("set_my_avatar_pick", { p_key: pick.key, p_bg: pick.bg });
  if (error) throw new Error("Não foi possível salvar o avatar. Tente novamente.");
}

/** Alterna entre foto e avatar já salvos (RPC set_my_avatar_kind). */
export async function saveAvatarKind(kind: AvatarKind): Promise<void> {
  const { error } = await supabase.rpc("set_my_avatar_kind", { p_kind: kind });
  if (error) throw new Error("Não foi possível trocar. Tente novamente.");
}
