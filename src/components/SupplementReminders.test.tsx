import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getMySupplements: vi.fn(), getSupplementsTakenToday: vi.fn(), toggleSupplementTaken: vi.fn() }));
vi.mock("@/lib/api", () => api);
vi.mock("@/lib/eventTracker", () => ({ tracker: { track: vi.fn() } }));
const { default: SupplementReminders } = await import("./SupplementReminders");

const S = (id: string, name: string, t: string | null, kind: "supplement" | "medication" = "supplement") => ({ id, name, dose: "1 un", kind, reminder_time: t, patient_id: "p", time_label: null, order_index: 0, created_at: "", brand: null, notes: null });
const renderIt = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SupplementReminders /></QueryClientProvider>);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
  api.getMySupplements.mockReset().mockResolvedValue([]);
  api.getSupplementsTakenToday.mockReset().mockResolvedValue(new Set());
  api.toggleSupplementTaken.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("SupplementReminders", () => {
  it("sem lembretes vencidos não renderiza nada", async () => {
    api.getMySupplements.mockResolvedValue([S("a", "Creatina", "18:00:00"), S("b", "Whey", null)]);
    const { container } = renderIt();
    await waitFor(() => expect(api.getMySupplements).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
  it("mostra só o que já passou do horário e não foi tomado", async () => {
    api.getMySupplements.mockResolvedValue([S("a", "Vitamina D", "08:00:00"), S("b", "Losartana", "07:00:00", "medication"), S("c", "Creatina", "18:00:00")]);
    api.getSupplementsTakenToday.mockResolvedValue(new Set(["a"]));
    renderIt();
    expect(await screen.findByText("Hora de tomar")).toBeTruthy();
    expect(screen.getByText("Losartana")).toBeTruthy();
    expect(screen.queryByText("Vitamina D")).toBeNull(); // já tomado
    expect(screen.queryByText("Creatina")).toBeNull(); // ainda não é hora
  });
  it("Tomei grava a marca de hoje para o item", async () => {
    api.getMySupplements.mockResolvedValue([S("b", "Losartana", "07:00:00", "medication")]);
    renderIt();
    fireEvent.click(await screen.findByRole("button", { name: "Marcar Losartana como tomado" }));
    await waitFor(() => expect(api.toggleSupplementTaken).toHaveBeenCalledWith({ supplementId: "b", on: true }));
  });
  it("mais de 3 vencidos: mostra 3 e avisa os demais", async () => {
    api.getMySupplements.mockResolvedValue(["a", "b", "c", "d", "e"].map((x, i) => S(x, `Item ${x}`, `0${i + 1}:00:00`)));
    renderIt();
    expect(await screen.findByText(/e mais 2 em Meu Plano/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /como tomado/ })).toHaveLength(3);
  });
});
