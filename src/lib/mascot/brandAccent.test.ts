import { describe, expect, it } from "vitest";

import { accessibleAccent, APP_ACCENT, AA_TEXT, CARD_BG, contrastRatio } from "./brandAccent";

describe("accessibleAccent", () => {
  it("sem cor ou cor inválida: laranja do app", () => {
    expect(accessibleAccent(null)).toBe(APP_ACCENT);
    expect(accessibleAccent("azul")).toBe(APP_ACCENT);
  });
  it("cor já legível fica como está (normalizada)", () => {
    expect(accessibleAccent("#f97316")).toBe("#F97316");
  });
  it("cores escuras da clínica são clareadas até AA (4.5:1) sobre o card", () => {
    for (const c of ["#0B3D2E", "#1A237E", "#000000", "#4A148C", "#222222"]) {
      const out = accessibleAccent(c);
      expect(contrastRatio(out, CARD_BG)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
  it("o laranja do app passa AA no card", () => {
    expect(contrastRatio(APP_ACCENT, CARD_BG)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
