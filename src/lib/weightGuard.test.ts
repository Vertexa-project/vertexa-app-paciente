import { describe, expect, it } from "vitest";
import { checkWeight, confirmMessage, daysBetween, MAX_KG_PER_DAY } from "./weightGuard";

const NOW = new Date("2026-10-21T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("conferência do peso (PDF do Ernâni, tela 03)", () => {
  it("o caso real: 117 → 108 em dois dias pede confirmação", () => {
    const c = checkWeight(108, { weight_kg: 117, measured_at: ago(2) }, NOW);
    expect(c.status).toBe("confirm");
    if (c.status === "confirm") { expect(c.deltaKg).toBe(-9); expect(c.days).toBe(2); expect(c.perDay).toBe(4.5); }
  });
  it("variação normal passa", () => {
    expect(checkWeight(116.5, { weight_kg: 117, measured_at: ago(1) }, NOW).status).toBe("ok");
    expect(checkWeight(115, { weight_kg: 117, measured_at: ago(1) }, NOW).status).toBe("ok"); // exatamente 2 kg/dia: não passa do limite
  });
  it("acima de 2 kg no mesmo dia pede confirmação; o limite é por dia", () => {
    expect(checkWeight(114.5, { weight_kg: 117, measured_at: ago(0) }, NOW).status).toBe("confirm");
    expect(checkWeight(108, { weight_kg: 117, measured_at: ago(5) }, NOW).status).toBe("ok"); // 1,8 kg/dia
  });
  it("vale para subida também", () => {
    expect(checkWeight(120, { weight_kg: 117, measured_at: ago(1) }, NOW).status).toBe("confirm");
  });
  it("sem registro anterior ou valor ilegível: passa", () => {
    expect(checkWeight(80, null, NOW).status).toBe("ok");
    expect(checkWeight(80, { weight_kg: "abc", measured_at: ago(1) }, NOW).status).toBe("ok");
  });
  it("aceita o numeric do banco como string", () => {
    expect(checkWeight(108, { weight_kg: "117.0", measured_at: ago(2) }, NOW).status).toBe("confirm");
  });
  it("dias: mínimo 1", () => {
    expect(daysBetween(ago(0), NOW)).toBe(1);
    expect(daysBetween(ago(3), NOW)).toBe(3);
    expect(MAX_KG_PER_DAY).toBe(2);
  });
  it("mensagem em português, com vírgula e singular", () => {
    const c = checkWeight(108, { weight_kg: 117, measured_at: ago(1) }, NOW);
    if (c.status !== "confirm") throw new Error("esperava confirm");
    expect(confirmMessage(108, c)).toBe("Seu último peso foi 117,0 kg, há 1 dia. Agora você digitou 108,0 kg — uma diferença de 9,0 kg. Está certo?");
  });
});
