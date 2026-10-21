import { describe, expect, it } from "vitest";
import { lastSevenDays, supplementWeek } from "./supplementWeek";

const TODAY = new Date(2026, 9, 21, 15, 0); // 21/10/2026 local
const iso = (y: number, m: number, d: number) => new Date(y, m, d, 9).toISOString();

describe("adesão semanal de suplementos (PDF do Ernâni, tela 24)", () => {
  it("7 dias terminando hoje, do mais antigo ao mais novo", () => {
    const d = lastSevenDays(TODAY);
    expect(d).toHaveLength(7);
    expect(d[0]).toBe("2026-10-15");
    expect(d[6]).toBe("2026-10-21");
  });

  it("conta tomadas sobre esperadas, 1 por dia", () => {
    const list = [{ id: "a", created_at: iso(2026, 8, 1) }];
    const intakes = ["2026-10-15", "2026-10-17", "2026-10-21"].map((taken_on) => ({ supplement_id: "a", taken_on }));
    const w = supplementWeek(list, intakes, TODAY);
    expect(w.expected).toBe(7);
    expect(w.taken).toBe(3);
    expect(w.perSupplement.a).toEqual([true, false, true, false, false, false, true]);
  });

  it("dias antes de o item existir não contam como falta", () => {
    const list = [{ id: "n", created_at: iso(2026, 9, 19) }]; // criado dia 19
    const w = supplementWeek(list, [], TODAY);
    expect(w.perSupplement.n).toEqual([null, null, null, null, false, false, false]);
    expect(w.expected).toBe(3);
    expect(w.taken).toBe(0);
  });

  it("marca de outro suplemento ou de fora da semana não entra", () => {
    const list = [{ id: "a", created_at: iso(2026, 8, 1) }];
    const w = supplementWeek(list, [{ supplement_id: "zzz", taken_on: "2026-10-21" }, { supplement_id: "a", taken_on: "2026-10-01" }], TODAY);
    expect(w.taken).toBe(0);
  });

  it("sem lista: nada esperado", () => {
    expect(supplementWeek([], [], TODAY).expected).toBe(0);
  });
});
