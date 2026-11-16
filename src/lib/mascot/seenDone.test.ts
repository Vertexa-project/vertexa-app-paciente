import { describe, expect, it } from "vitest";

import { readSeenDone, writeSeenDone } from "./seenDone";

function fake() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("seenDone", () => {
  it("guarda e lê por dia; dia novo começa sem registro", () => {
    const s = fake();
    expect(readSeenDone("2026-11-16", s)).toBeNull();
    writeSeenDone("2026-11-16", 2, s);
    expect(readSeenDone("2026-11-16", s)).toBe(2);
    expect(readSeenDone("2026-11-17", s)).toBeNull();
  });
  it("valor corrompido ou storage que falha vira null, sem quebrar", () => {
    const s = fake();
    s.setItem("vertexa:mascot:done:2026-11-16", "abc");
    expect(readSeenDone("2026-11-16", s)).toBeNull();
    expect(readSeenDone("x", { getItem: () => { throw new Error("denied"); } })).toBeNull();
    expect(() => writeSeenDone("x", 1, { setItem: () => { throw new Error("denied"); } })).not.toThrow();
  });
});
