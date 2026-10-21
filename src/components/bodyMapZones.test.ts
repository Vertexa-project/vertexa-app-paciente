import { describe, it, expect } from "vitest";
import { BODY_VIEWBOX, OFFICIAL_MUSCLES } from "./officialMuscles";
import type { CanonicalMuscle } from "@/lib/api/types";

const CANON: CanonicalMuscle[] = ["chest", "biceps", "triceps", "lats", "shoulders", "abs", "quadriceps", "traps", "forearms", "lower_back", "glutes", "hamstrings", "calves"];

describe("body map oficial", () => {
  it("tem os 23 músculos da frente e 18 das costas do pacote oficial", () => {
    expect(OFFICIAL_MUSCLES.filter((m) => m.side === "front")).toHaveLength(23);
    expect(OFFICIAL_MUSCLES.filter((m) => m.side === "back")).toHaveLength(18);
  });
  it("cobre os 13 grupos canônicos, sem inventar grupo", () => {
    const set = new Set(OFFICIAL_MUSCLES.map((m) => m.muscle));
    expect([...set].sort()).toEqual([...CANON].sort());
  });
  it("ids únicos e prefixo igual à vista", () => {
    const ids = OFFICIAL_MUSCLES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of OFFICIAL_MUSCLES) expect(m.id.startsWith(m.side === "front" ? "frente_" : "costas_")).toBe(true);
  });
  it("todo ponto dos paths está dentro do viewBox do PNG da vista", () => {
    for (const m of OFFICIAL_MUSCLES) {
      const { w, h } = BODY_VIEWBOX[m.side];
      const n = (m.d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
      expect(n.length % 2).toBe(0);
      for (let i = 0; i < n.length; i += 2) {
        expect(n[i]).toBeGreaterThanOrEqual(0); expect(n[i]).toBeLessThanOrEqual(w);
        expect(n[i + 1]).toBeGreaterThanOrEqual(0); expect(n[i + 1]).toBeLessThanOrEqual(h);
      }
    }
  });
});
