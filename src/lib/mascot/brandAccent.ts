// Cor da clínica no card do tigrezinho com contraste AA (4.5:1) para texto sobre o fundo escuro do app.
import { normalizeHexColor } from "@/lib/clinicBrand";

/** Laranja do app (--primary 24 95% 53%) e o fundo do card (--card 0 0% 11%). */
export const APP_ACCENT = "#F97316";
export const CARD_BG = "#1C1C1C";
export const AA_TEXT = 4.5;

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mixWithWhite(hex: string, t: number): string {
  const out = channels(hex).map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, "0"));
  return `#${out.join("").toUpperCase()}`;
}

/** Cor de destaque legível sobre `bg`: a da clínica, clareada o mínimo necessário até dar 4.5:1. Sem cor/inválida → laranja do app. */
export function accessibleAccent(raw: string | null | undefined, bg: string = CARD_BG): string {
  const hex = normalizeHexColor(raw);
  if (!hex) return APP_ACCENT;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = t === 0 ? hex : mixWithWhite(hex, t);
    if (contrastRatio(c, bg) >= AA_TEXT) return c;
  }
  return "#FFFFFF";
}
