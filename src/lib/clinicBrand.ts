// Identidade da clínica no app (somente leitura; quem grava é o web do profissional).
// Espelha vertexa-web-pro/src/lib/domain/clinicBrand.ts — bucket público 'clinic-logos'.
export const CLINIC_LOGOS_BUCKET = "clinic-logos";
export interface ClinicBrand {
  clinicId: string;
  name: string;
  logoPath: string | null;
  color: string | null;
}

/** "#1a2b3c" / "1A2B3C" → "#1A2B3C"; inválido → null. */
export function normalizeHexColor(raw: string | null | undefined): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((raw ?? "").trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

/** URL pública da logo (bucket público). Sem caminho → null. */
export function logoPublicUrl(supabaseUrl: string, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${CLINIC_LOGOS_BUCKET}/${path}`;
}

/** Iniciais para o fallback quando a clínica não tem logo ("Clínica Teste Hefesto" → "CT"). */
export function brandInitials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter((w) => w.length > 0 && /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "?";
  const pick = words.length === 1 ? [words[0]] : [words[0], words[1]];
  return pick.map((w) => Array.from(w)[0].toUpperCase()).join("");
}
