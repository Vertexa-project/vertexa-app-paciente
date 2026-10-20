import { describe, expect, it } from "vitest";
import { brandInitials, logoPublicUrl, normalizeHexColor } from "./clinicBrand";

describe("clinicBrand (app)", () => {
  it("URL pública só existe com caminho", () => {
    expect(logoPublicUrl("https://x.supabase.co/", "c/a.png")).toBe("https://x.supabase.co/storage/v1/object/public/clinic-logos/c/a.png");
    expect(logoPublicUrl("https://x.supabase.co", null)).toBeNull();
  });
  it("cor: normaliza ou recusa", () => {
    expect(normalizeHexColor("#1a2b3c")).toBe("#1A2B3C");
    expect(normalizeHexColor("azul")).toBeNull();
    expect(normalizeHexColor(null)).toBeNull();
  });
  it("iniciais de fallback", () => {
    expect(brandInitials("Clínica Teste Hefesto")).toBe("CT");
    expect(brandInitials("")).toBe("?");
  });
});
