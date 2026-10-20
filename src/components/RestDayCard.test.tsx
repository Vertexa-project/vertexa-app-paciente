import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getRestDays: vi.fn(), markRestDay: vi.fn(), undoRestDay: vi.fn() }));
vi.mock("@/lib/api", () => api);
const { default: RestDayCard } = await import("./RestDayCard");
const { brtYmd, previousYmd } = await import("@/lib/restDay");

const today = brtYmd();
const yesterday = previousYmd(today);
const renderCard = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RestDayCard /></QueryClientProvider>);

beforeEach(() => {
  api.getRestDays.mockReset().mockResolvedValue([]);
  api.markRestDay.mockReset().mockResolvedValue(undefined);
  api.undoRestDay.mockReset().mockResolvedValue(undefined);
});

describe("RestDayCard", () => {
  it("sem descanso marcado: oferece marcar hoje e ontem", async () => {
    renderCard();
    expect(await screen.findByRole("button", { name: "Hoje é meu dia de descanso" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ontem foi meu descanso" })).toBeTruthy();
  });
  it("marcar hoje envia o dia de hoje (BRT)", async () => {
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Hoje é meu dia de descanso" }));
    await waitFor(() => expect(api.markRestDay).toHaveBeenCalledWith(today));
  });
  it("marcar ontem envia o dia de ontem", async () => {
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Ontem foi meu descanso" }));
    await waitFor(() => expect(api.markRestDay).toHaveBeenCalledWith(yesterday));
  });
  it("hoje já marcado: confirma, protege a sequência e permite desfazer", async () => {
    api.getRestDays.mockResolvedValue([today]);
    renderCard();
    expect(await screen.findByText(/sequência está protegida/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hoje é meu dia de descanso" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await waitFor(() => expect(api.undoRestDay).toHaveBeenCalledWith(today));
  });
  it("limite semanal do servidor aparece como mensagem clara, sem confirmar", async () => {
    api.markRestDay.mockRejectedValue({ hint: "REST_DAY_LIMIT" });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Hoje é meu dia de descanso" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/2 dias de descanso nesta semana/);
    expect(screen.queryByText(/sequência está protegida/)).toBeNull();
  });
});
