import { describe, expect, it, vi } from "vitest";
import { cardStats, shareOrDownload, wrapLines } from "./weeklyCard";
import type { WeeklySummary } from "./weeklySummary";

const S = (o: Partial<WeeklySummary> = {}): WeeklySummary => ({
  rangeStart: "2026-10-19", rangeEnd: "2026-10-25", isClosed: true, kcalByDay: [0, 0, 0, 0, 0, 0, 0], kcalTotal: 1250, kcalAvgPerDay: null, kcalVsPrevPct: null,
  workoutsDone: 3, workoutsPlanned: 5, streak: 1, vriDelta: null, score: null, mealsPct: 72, ...o,
});
const m = (s: string) => s.length * 10;

describe("cartão do resumo", () => {
  it("quebra por largura e não perde palavras", () => {
    const lines = wrapLines("um dois três quatro cinco seis", 100, m);
    expect(lines.join(" ")).toBe("um dois três quatro cinco seis");
    expect(lines.every((l) => m(l) <= 100 || !l.includes(" "))).toBe(true);
    expect(lines.length).toBeGreaterThan(1);
  });
  it("palavra maior que a linha fica sozinha; texto vazio não gera linhas", () => {
    expect(wrapLines("supercalifragilistico a", 50, m)).toEqual(["supercalifragilistico", "a"]);
    expect(wrapLines("   ", 50, m)).toEqual([]);
  });
  it("números do cartão: treinos, sequência no singular, refeições e kcal", () => {
    const st = cardStats(S());
    expect(st.map((x) => x.value)).toEqual(["3/5", "1 dia", "72%", "1.250"]);
    expect(st[3].label).toBe("kcal estimadas");
  });
  it("sem ficha e sem plano alimentar: rótulos honestos", () => {
    const st = cardStats(S({ workoutsPlanned: 0, workoutsDone: 2, mealsPct: null }));
    expect(st[0]).toEqual({ value: "2", label: "dias com treino" });
    expect(st[2]).toEqual({ value: "—", label: "sem plano alimentar" });
  });
});

describe("compartilhar", () => {
  const blob = new Blob(["x"], { type: "image/png" });
  it("usa o compartilhamento do sistema quando aceita arquivos", async () => {
    const share = vi.fn(async () => undefined);
    Object.assign(navigator, { share, canShare: () => true });
    expect(await shareOrDownload(blob, "r.png")).toBe("shared");
    expect(share).toHaveBeenCalled();
  });
  it("cancelar no painel de compartilhar não baixa nada", async () => {
    Object.assign(navigator, { share: vi.fn(async () => { throw Object.assign(new Error("x"), { name: "AbortError" }); }), canShare: () => true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    expect(await shareOrDownload(blob, "r.png")).toBe("cancelled");
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });
  it("sem suporte: baixa a imagem", async () => {
    Object.assign(navigator, { share: undefined, canShare: undefined });
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:x";
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    expect(await shareOrDownload(blob, "r.png")).toBe("downloaded");
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });
});
