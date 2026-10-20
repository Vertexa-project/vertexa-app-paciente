import { describe, expect, it } from "vitest";
import { brtYmd, previousYmd, restDayErrorMessage } from "./restDay";

describe("restDay", () => {
  it("dia no fuso de São Paulo (23h30 BRT ainda é o dia anterior em UTC+0 do dia seguinte)", () => {
    expect(brtYmd(new Date("2026-10-21T02:30:00Z"))).toBe("2026-10-20"); // 23:30 em SP
    expect(brtYmd(new Date("2026-10-21T03:30:00Z"))).toBe("2026-10-21"); // 00:30 em SP
  });
  it("dia anterior atravessa mês e ano", () => {
    expect(previousYmd("2026-03-01")).toBe("2026-02-28");
    expect(previousYmd("2026-01-01")).toBe("2025-12-31");
  });
  it("mensagens por causa do erro", () => {
    expect(restDayErrorMessage({ hint: "REST_DAY_LIMIT" })).toMatch(/2 dias de descanso/);
    expect(restDayErrorMessage({ code: "23505" })).toMatch(/já está marcado/);
    expect(restDayErrorMessage(new Error("x"))).toMatch(/Não foi possível/);
  });
});
