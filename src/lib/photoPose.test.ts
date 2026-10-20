import { describe, expect, it } from "vitest";

import { comparablePoses, groupByPose, isPhotoPose, poseKey, sortAsc } from "./photoPose";

const ph = (id: string, taken_at: string | null, pose?: string | null) => ({ id, taken_at, pose });

describe("photoPose (app)", () => {
  it("posição inválida/ausente vira 'none'", () => {
    expect(poseKey({ pose: "front" })).toBe("front");
    expect(poseKey({ pose: "diagonal" })).toBe("none");
    expect(poseKey({})).toBe("none");
    expect(isPhotoPose("back")).toBe(true);
    expect(isPhotoPose("x")).toBe(false);
  });
  it("ordena do mais antigo ao mais novo; sem data no fim", () => {
    expect(sortAsc([ph("b", "2026-02-01"), ph("n", null), ph("a", "2026-01-01")]).map((p) => p.id)).toEqual(["a", "b", "n"]);
  });
  it("agrupa por posição e só libera comparação com 2+ fotos na MESMA posição", () => {
    const list = [ph("f1", "2026-01-01", "front"), ph("b1", "2026-01-02", "back"), ph("f2", "2026-02-01", "front"), ph("o", "2026-01-03")];
    expect(groupByPose(list).front.map((p) => p.id)).toEqual(["f1", "f2"]);
    expect(comparablePoses(list)).toEqual(["front"]);
    expect(comparablePoses([ph("f1", "2026-01-01", "front"), ph("b1", "2026-01-02", "back")])).toEqual([]);
  });
});
