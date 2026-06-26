import { describe, it, expect } from "vitest";
import {
  mirrorPathX,
  resolveZonePaths,
  ZONES_BY_SIDE,
  FACE_VIEWBOX,
  type BodyZone,
} from "./bodyMapZones";
import type { CanonicalMuscle } from "@/lib/api/types";

// Extrai os pares numéricos (x,y) de um path absoluto simples M/L/C/Q/Z.
function coords(d: string): number[] {
  return (d.match(/-?\d*\.?\d+/g) || []).map(Number);
}

describe("mirrorPathX", () => {
  it("espelha o x de um M em torno de x=50", () => {
    expect(mirrorPathX("M 40 41")).toBe("M 60 41");
  });

  it("espelha todos os x de L, preservando os y", () => {
    expect(mirrorPathX("M 30 50 L 20 60")).toBe("M 70 50 L 80 60");
  });

  it("espelha os 3 pontos de controle/destino de um C (x nos índices pares)", () => {
    // C x1 y1 x2 y2 x y -> x1,x2,x espelhados; y1,y2,y intactos
    expect(mirrorPathX("C 31.5 53.5 27.5 54.5 26 58")).toBe("C 68.5 53.5 72.5 54.5 74 58");
  });

  it("mantém Z inalterado e respeita vírgulas como separador", () => {
    expect(mirrorPathX("M 40,41 L 30,50 Z")).toBe("M 60 41 L 70 50 Z");
  });

  it("aceita eixo customizado", () => {
    expect(mirrorPathX("M 10 0", 0)).toBe("M -10 0");
  });

  it("espelhar duas vezes volta às coordenadas originais (involução)", () => {
    const d = "M 49,88 L 41.5,90 C 39.5,96 39.5,110 42,119 L 46,122 Z";
    const twice = coords(mirrorPathX(mirrorPathX(d)));
    expect(twice).toEqual(coords(d));
  });
});

describe("resolveZonePaths", () => {
  const zones = [...ZONES_BY_SIDE.front, ...ZONES_BY_SIDE.back];

  it("retorna 2 instâncias p/ bilateral e 1 p/ central", () => {
    const bilateral = zones.find((z) => z.mirror)!;
    const central = zones.find((z) => !z.mirror)!;
    expect(resolveZonePaths(bilateral)).toHaveLength(2);
    expect(resolveZonePaths(central)).toHaveLength(1);
  });

  it("a 2ª instância (espelho) tem center refletido em x=50", () => {
    const z = ZONES_BY_SIDE.front.find((zz) => zz.id === "front-quadriceps")!;
    const [orig, mirrored] = resolveZonePaths(z);
    expect(mirrored.center.x).toBeCloseTo(100 - orig.center.x, 5);
    expect(mirrored.center.y).toBe(orig.center.y);
  });
});

describe("integridade das zonas", () => {
  const all = [...ZONES_BY_SIDE.front, ...ZONES_BY_SIDE.back];

  it("cobre exatamente os 13 grupos canônicos (sem inventar grupo)", () => {
    const canonical: CanonicalMuscle[] = [
      "chest", "biceps", "triceps", "lats", "shoulders", "abs", "forearms",
      "quadriceps", "hamstrings", "glutes", "calves", "traps", "lower_back",
    ];
    const used = new Set(all.map((z) => z.muscle));
    expect([...used].sort()).toEqual([...canonical].sort());
  });

  it("todo path começa com M e fecha com Z; todo ponto está dentro do viewBox da face", () => {
    for (const z of all) {
      expect(z.path.trim().startsWith("M")).toBe(true);
      expect(z.path.trim().endsWith("Z")).toBe(true);
      const { w, h } = FACE_VIEWBOX[z.side];
      const nums = coords(z.path);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = nums[i];
        const y = nums[i + 1];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(w);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(h);
      }
      expect(z.center.x).toBeGreaterThanOrEqual(0);
      expect(z.center.x).toBeLessThanOrEqual(w);
      expect(z.center.y).toBeGreaterThanOrEqual(0);
      expect(z.center.y).toBeLessThanOrEqual(h);
    }
  });

  it("ids únicos por face", () => {
    const ids = all.map((z: BodyZone) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
