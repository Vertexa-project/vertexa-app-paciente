import { describe, expect, it } from "vitest";
import { poseSeries } from "./poseGuide";

const NOW = new Date("2026-10-21T12:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("guia de pose (PDF do Ernâni, tela 05)", () => {
  it("sem fotos: nada marcado e a próxima é frente", () => {
    const s = poseSeries([], NOW);
    expect(s.done.size).toBe(0);
    expect(s.next).toBe("front");
    expect(s.lastShotAt).toBeNull();
  });
  it("marca as poses da última semana e sugere a primeira que falta", () => {
    const s = poseSeries([{ pose: "front", taken_at: ago(1) }, { pose: "back", taken_at: ago(2) }], NOW);
    expect([...s.done].sort()).toEqual(["back", "front"]);
    expect(s.next).toBe("side");
  });
  it("série completa: sem próxima", () => {
    const s = poseSeries(["front", "side", "back"].map((pose) => ({ pose, taken_at: ago(3) })), NOW);
    expect(s.next).toBeNull();
  });
  it("foto de séries antigas não marca check (janela de 7 dias)", () => {
    const s = poseSeries([{ pose: "front", taken_at: ago(8) }, { pose: "side", taken_at: ago(7) }], NOW);
    expect(s.done.has("front")).toBe(false);
    expect(s.done.has("side")).toBe(true);
    expect(s.next).toBe("front");
  });
  it("foto sem posição ou com posição inválida não conta", () => {
    const s = poseSeries([{ pose: null, taken_at: ago(1) }, { pose: "diagonal", taken_at: ago(1) }], NOW);
    expect(s.done.size).toBe(0);
  });
  it("lastShotAt é a mais recente de qualquer posição, mesmo antiga", () => {
    const s = poseSeries([{ pose: null, taken_at: ago(30) }, { pose: "front", taken_at: ago(20) }], NOW);
    expect(s.lastShotAt).toBe(ago(20));
  });
});
