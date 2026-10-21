import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ inserted: null as Record<string, unknown> | null, inArgs: null as unknown[] | null }));
vi.mock("./patient", () => ({ getMyPatientId: vi.fn(async () => "pat1") }));
vi.mock("@/lib/supabase", () => {
  const chain: Record<string, unknown> = {};
  chain.insert = (row: Record<string, unknown>) => { h.inserted = row; return chain; };
  chain.select = () => chain; chain.eq = () => chain; chain.order = () => chain; chain.limit = () => Promise.resolve({ data: [], error: null });
  chain.in = (...a: unknown[]) => { h.inArgs = a; return chain; };
  chain.single = () => Promise.resolve({ data: { id: "1" }, error: null });
  return { supabase: { from: () => chain } };
});
import { getRecentWeightLogs, logWeight } from "./weight";
beforeEach(() => { h.inserted = null; h.inArgs = null; });

describe("peso suspeito no app (PDF do Ernâni, tela 03)", () => {
  it("suspeito grava review_status 'pending'; normal não manda a coluna", async () => {
    await logWeight({ weightKg: 58, suspect: true });
    expect(h.inserted).toMatchObject({ weight_kg: 58, review_status: "pending" });
    await logWeight({ weightKg: 70 });
    expect(h.inserted).not.toHaveProperty("review_status");
  });
  it("curva e referência só leem ok/approved (pendente e recusado ficam fora)", async () => {
    await getRecentWeightLogs(6);
    expect(h.inArgs).toEqual(["review_status", ["ok", "approved"]]);
  });
});
