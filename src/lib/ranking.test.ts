import { describe, expect, it } from "vitest";
import { DAILY_CAP, POINT_RULES, me, pointsToNext } from "./ranking";
import type { RankingRow } from "./api/ranking";

const R = (position: number, points: number, isMe = false): RankingRow => ({ position, initials: "XX", points, activeDays: 1, isMe });

describe("ranking", () => {
  it("as regras somam o teto diário", () => {
    expect(POINT_RULES.reduce((s, r) => s + r.points, 0)).toBe(DAILY_CAP);
  });
  it("me acha a própria linha", () => {
    expect(me([R(1, 50), R(2, 40, true)])?.points).toBe(40);
    expect(me([R(1, 50)])).toBeNull();
  });
  it("pontos para a posição de cima: pega o MENOR placar acima, não o do líder", () => {
    expect(pointsToNext([R(1, 90), R(2, 60), R(3, 40, true)])).toBe(20);
  });
  it("líder, ausente ou sozinha: sem 'faltam'", () => {
    expect(pointsToNext([R(1, 90, true), R(2, 60)])).toBeNull();
    expect(pointsToNext([R(1, 90)])).toBeNull();
    expect(pointsToNext([R(1, 50, true)])).toBeNull();
  });
  it("empatada em 1º não tem quem alcançar", () => {
    expect(pointsToNext([R(1, 50, true), R(1, 50)])).toBeNull();
  });
});
