import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ start: "2026-09-17" as string | null }));
vi.mock("./patient", () => ({ getMyPatientId: vi.fn(async () => "p1"), getPatient: vi.fn(async () => ({ start_date: h.start })) }));
vi.mock("@/lib/supabase", () => {
  const rows = [{ score: 90, level: "alta", status: "em_acompanhamento", streak: 40, weekly_completion_rate: 80, risk_factors: [], positive_factors: [], calculated_at: "2026-10-21" }];
  const chain: Record<string, unknown> = {};
  chain.select = () => chain; chain.eq = () => chain; chain.order = () => chain; chain.limit = () => Promise.resolve({ data: rows, error: null });
  return { supabase: { from: () => chain } };
});
import { getLatestAdherenceState } from "./adherence";

describe("fase da Jornada no estado de adesão (Home e Perfil)", () => {
  it("vem do tempo de acompanhamento, não da sequência (sequência 40 não faz 'revisão de progresso')", async () => {
    vi.setSystemTime(new Date(2026, 9, 1)); // dia 15 de acompanhamento
    h.start = "2026-09-17";
    const s = await getLatestAdherenceState();
    expect(s?.journeyPhase).toBe("constancia_inicial");
    vi.useRealTimers();
  });
  it("sem data de início, mantém a fase derivada do snapshot", async () => {
    h.start = null;
    const s = await getLatestAdherenceState();
    expect(s?.journeyPhase).toBe("revisao_progresso"); // streak 40 (regra antiga do engine, só sem data)
  });
});
