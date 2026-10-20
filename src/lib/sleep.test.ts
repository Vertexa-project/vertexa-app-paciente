import { describe, expect, it } from "vitest";
import { formatSleepHours, localYmd, parseSleepHours } from "./sleep";

describe("sono (regras puras)", () => {
  it("aceita vírgula e ponto, 0,5 a 24", () => {
    expect(parseSleepHours("7,5")).toBe(7.5);
    expect(parseSleepHours(" 8 ")).toBe(8);
    expect(parseSleepHours("0.5")).toBe(0.5);
    expect(parseSleepHours("24")).toBe(24);
  });
  it("recusa vazio, texto, zero, negativo e acima de 24", () => {
    for (const bad of ["", "abc", "0", "0.4", "-3", "24.5", "25", "7,555", "7.5h"]) expect(parseSleepHours(bad)).toBeNull();
  });
  it("formata horas e minutos", () => {
    expect(formatSleepHours(7.5)).toBe("7h30");
    expect(formatSleepHours(8)).toBe("8h");
    expect(formatSleepHours(6.25)).toBe("6h15");
  });
  it("data local aaaa-mm-dd com zeros", () => {
    expect(localYmd(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
