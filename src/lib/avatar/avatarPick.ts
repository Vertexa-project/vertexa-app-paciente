// Avatar do paciente: 8 bichinhos (marcadores; o desenho final é do design) + 5 cores de fundo.
// Mesma lista da migration redesign_p7 (constraints do banco).
export const AVATAR_ANIMALS = [
  { key: "raposa", label: "Raposa", emoji: "🦊" },
  { key: "tigre", label: "Tigre", emoji: "🐯" },
  { key: "panda", label: "Panda", emoji: "🐼" },
  { key: "coruja", label: "Coruja", emoji: "🦉" },
  { key: "coala", label: "Coala", emoji: "🐨" },
  { key: "leao", label: "Leão", emoji: "🦁" },
  { key: "pinguim", label: "Pinguim", emoji: "🐧" },
  { key: "sapo", label: "Sapo", emoji: "🐸" },
] as const;

export const AVATAR_BGS = ["#E6F6EE", "#FFEDE8", "#EAF0FD", "#FEF5DC", "#F2F2F0"] as const;

export type AvatarKey = (typeof AVATAR_ANIMALS)[number]["key"];
export type AvatarBg = (typeof AVATAR_BGS)[number];
export type AvatarKind = "photo" | "avatar";

export function isAvatarKey(v: unknown): v is AvatarKey {
  return AVATAR_ANIMALS.some((a) => a.key === v);
}

export function isAvatarBg(v: unknown): v is AvatarBg {
  return typeof v === "string" && (AVATAR_BGS as readonly string[]).includes(v.toUpperCase());
}

/** Valida a escolha; null = inválida (nada é enviado). A cor volta em maiúsculas, como o banco guarda. */
export function normalizeAvatarPick(key: unknown, bg: unknown): { key: AvatarKey; bg: AvatarBg } | null {
  if (!isAvatarKey(key) || !isAvatarBg(bg)) return null;
  return { key, bg: (bg as string).toUpperCase() as AvatarBg };
}

export function avatarEmoji(key: AvatarKey): string {
  return AVATAR_ANIMALS.find((a) => a.key === key)!.emoji;
}

export interface AvatarSource {
  kind?: string | null;
  key?: string | null;
  bg?: string | null;
  avatarPath?: string | null;
  legacyUrl?: string | null;
}

export type AvatarView =
  | { type: "avatar"; key: AvatarKey; bg: AvatarBg; emoji: string }
  | { type: "photo" }
  | { type: "initials" };

/** O que mostrar: o escolhido (avatar_kind) se estiver utilizável; senão a outra opção que existir; senão iniciais. */
export function resolveAvatarView(s: AvatarSource): AvatarView {
  const pick = normalizeAvatarPick(s.key, s.bg);
  const hasPhoto = Boolean(s.avatarPath || s.legacyUrl);
  const asAvatar = (): AvatarView | null => (pick ? { type: "avatar", ...pick, emoji: avatarEmoji(pick.key) } : null);
  if (s.kind === "avatar") return asAvatar() ?? (hasPhoto ? { type: "photo" } : { type: "initials" });
  if (s.kind === "photo") return hasPhoto ? { type: "photo" } : (asAvatar() ?? { type: "initials" });
  return hasPhoto ? { type: "photo" } : { type: "initials" };
}
