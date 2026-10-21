import { describe, expect, it } from "vitest";
import { photoCaption, weightNear } from "./photoWeight";

const L = (d: string, kg: number | string) => ({ measured_at: `${d}T10:00:00Z`, weight_kg: kg });

describe("peso de cada foto (PDF do Ernâni, tela 16)", () => {
  it("pega o registro mais próximo da data da foto", () => {
    const logs = [L("2026-09-10", 118), L("2026-09-17", 117.5), L("2026-09-24", 115.6)];
    expect(weightNear("2026-09-17T12:00:00Z", logs)).toBe(117.5);
    expect(weightNear("2026-09-23T12:00:00Z", logs)).toBe(115.6);
  });
  it("sem registro a até 7 dias: sem peso (não inventa)", () => {
    expect(weightNear("2026-10-30T12:00:00Z", [L("2026-09-17", 117.5)])).toBeNull();
    expect(weightNear("2026-09-24T10:00:00Z", [L("2026-09-17", 117.5)])).toBe(117.5); // exatamente 7 dias
    expect(weightNear("2026-09-24T11:00:00Z", [L("2026-09-17", 117.5)])).toBeNull(); // 7 dias e 1 hora
  });
  it("aceita numeric como string e ignora lixo", () => {
    expect(weightNear("2026-09-17T12:00:00Z", [L("2026-09-17", "117.5"), { measured_at: "x", weight_kg: 1 }])).toBe(117.5);
    expect(weightNear("lixo", [L("2026-09-17", 1)])).toBeNull();
    expect(weightNear("2026-09-17T12:00:00Z", [])).toBeNull();
  });
  it("legenda com vírgula, ou só a data", () => {
    expect(photoCaption("17 set", 117.5)).toBe("17 set · 117,5 kg");
    expect(photoCaption("17 set", null)).toBe("17 set");
  });
});
