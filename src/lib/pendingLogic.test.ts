import { describe, it, expect } from "vitest";
import { derivePending, daysAgoLocal, localDateKey } from "./pendingLogic";

const now = new Date(2026, 5, 25, 12, 0, 0); // 25 Jun 2026 (mês 5 = junho)
const iso = (y: number, m: number, d: number, h = 8) => new Date(y, m, d, h, 0, 0).toISOString();

describe("daysAgoLocal", () => {
  it("conta dias inteiros locais", () => {
    expect(daysAgoLocal(iso(2026, 5, 22), now)).toBe(3);
    expect(daysAgoLocal(iso(2026, 5, 25, 1), now)).toBe(0);
  });
});

describe("localDateKey", () => {
  it("formata a data LOCAL como YYYY-MM-DD (mês/dia zero-padded)", () => {
    expect(localDateKey(new Date(2026, 6, 1, 23, 30))).toBe("2026-07-01"); // mês 6 = julho
    expect(localDateKey(new Date(2026, 0, 5, 0, 0))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31, 12))).toBe("2026-12-31");
  });
});

describe("derivePending", () => {
  it("peso pendente quando > 7 dias ou ausente", () => {
    expect(derivePending({ lastWeightAt: iso(2026, 5, 10), lastPhotoAt: null, workoutTodayAt: null, now }).weightPending).toBe(true);
    expect(derivePending({ lastWeightAt: iso(2026, 5, 22), lastPhotoAt: null, workoutTodayAt: null, now }).weightPending).toBe(false);
    expect(derivePending({ lastWeightAt: null, lastPhotoAt: null, workoutTodayAt: null, now }).weightPending).toBe(true);
  });

  it("respeita weightStaleDays customizado", () => {
    expect(derivePending({ lastWeightAt: iso(2026, 5, 22), lastPhotoAt: null, workoutTodayAt: null, now, weightStaleDays: 2 }).weightPending).toBe(true);
  });

  it("foto pendente quando não há foto no mês corrente", () => {
    expect(derivePending({ lastWeightAt: null, lastPhotoAt: iso(2026, 4, 30), workoutTodayAt: null, now }).photoPending).toBe(true); // maio
    expect(derivePending({ lastWeightAt: null, lastPhotoAt: iso(2026, 5, 2), workoutTodayAt: null, now }).photoPending).toBe(false); // junho
    expect(derivePending({ lastWeightAt: null, lastPhotoAt: null, workoutTodayAt: null, now }).photoPending).toBe(true);
  });

  it("treino pendente quando não há workout hoje", () => {
    expect(derivePending({ lastWeightAt: null, lastPhotoAt: null, workoutTodayAt: null, now }).workoutPending).toBe(true);
    expect(derivePending({ lastWeightAt: null, lastPhotoAt: null, workoutTodayAt: iso(2026, 5, 25, 9), now }).workoutPending).toBe(false);
  });

  it("expõe os 'dias atrás' para o subtítulo", () => {
    const p = derivePending({ lastWeightAt: iso(2026, 5, 18), lastPhotoAt: iso(2026, 5, 12), workoutTodayAt: null, now });
    expect(p.weightDaysAgo).toBe(7);
    expect(p.photoDaysAgo).toBe(13);
  });
});
