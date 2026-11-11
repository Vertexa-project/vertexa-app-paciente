import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { buildLibraryMediaIndex, exerciseMediaUrl } from "./exerciseLibrary";
import { gifForName } from "./workouts";

const rows = [
  { name: "Tríceps corda na polia", aliases: ["Tríceps corda"], media_webp: "triceps/triceps_corda-polia.webp" },
  { name: "Mesa flexora", aliases: null, media_webp: "posterior/posterior_mesa-flexora.webp" },
];
const index = buildLibraryMediaIndex(rows, "https://p.supabase.co");
const url = (p: string) => exerciseMediaUrl("https://p.supabase.co", p);

describe("GIF do exercício pela Biblioteca", () => {
  it("o nome prescrito, escrito de outro jeito, acha a animação da Biblioteca", () => {
    expect(gifForName("triceps  corda na POLIA", null, index)).toBe(url("triceps/triceps_corda-polia.webp"));
    expect(gifForName("Mesa Flexora", null, index)).toBe(url("posterior/posterior_mesa-flexora.webp"));
    expect(gifForName("Tríceps corda", null, index)).toBe(url("triceps/triceps_corda-polia.webp"));
  });

  it("GIF gravado no exercício vence a Biblioteca", () => {
    expect(gifForName("Mesa flexora", "https://x/y.gif", index)).toBe("https://x/y.gif");
  });

  it("fora da Biblioteca cai no GIF antigo ou fica vazio (o app mostra o ícone)", () => {
    expect(gifForName("Exercício inventado", null, index)).toBe("");
    expect(gifForName("Exercício inventado", null)).toBe("");
  });
});
