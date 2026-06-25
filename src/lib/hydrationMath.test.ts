import { describe, it, expect } from "vitest";
import { sumHydrationLiters } from "./hydrationMath";

describe("sumHydrationLiters", () => {
  it("sums payload.liters (chave canônica)", () => {
    expect(sumHydrationLiters([{ payload: { liters: 0.25 } }, { payload: { liters: 1 } }])).toBe(1.25);
  });

  it("tolera o alias legado amount e strings numéricas na LEITURA", () => {
    expect(sumHydrationLiters([{ payload: { amount: 0.5 } }, { payload: { liters: "0.75" } }])).toBe(1.25);
  });

  it("prioriza liters quando ambos estão presentes", () => {
    expect(sumHydrationLiters([{ payload: { liters: 1, amount: 99 } }])).toBe(1);
  });

  it("ignora linhas sem valor numérico", () => {
    expect(
      sumHydrationLiters([
        { payload: null },
        { payload: { source: "records" } },
        { payload: { liters: "abc" } },
        { payload: { liters: 1 } },
      ])
    ).toBe(1);
  });

  it("arredonda para 2 casas (incrementos de 0,25 não fazem drift)", () => {
    const rows = Array.from({ length: 3 }, () => ({ payload: { liters: 0.1 } }));
    expect(sumHydrationLiters(rows)).toBe(0.3);
  });

  it("soma vazia = 0", () => {
    expect(sumHydrationLiters([])).toBe(0);
  });
});
