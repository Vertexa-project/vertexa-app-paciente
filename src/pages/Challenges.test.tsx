import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ member: false, rows: [] as unknown[], join: vi.fn(), leave: vi.fn(), get: vi.fn(), rowsFail: false }));
vi.mock("@/lib/api", () => ({
  isInRanking: vi.fn(async () => api.member),
  getClinicRanking: (p: string) => api.get(p),
  joinRanking: () => api.join(), leaveRanking: () => api.leave(),
}));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
import Challenges from "./Challenges";

const row = (position: number, initials: string, points: number, isMe = false) => ({ position, initials, points, activeDays: 3, isMe });
const renderIt = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Challenges /></MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  api.member = false; api.rowsFail = false;
  api.join.mockReset().mockResolvedValue(undefined); api.leave.mockReset().mockResolvedValue(undefined);
  api.get.mockReset().mockImplementation(async () => { if (api.rowsFail) throw new Error("x"); return api.rows; });
  api.rows = [row(1, "JP", 90), row(2, "MS", 60, true), row(3, "CA", 20)];
});

describe("Desafio / ranking", () => {
  it("sem aceitar: mostra o consentimento e NÃO consulta o ranking", async () => {
    renderIt();
    expect(await screen.findByTestId("ranking-consent")).toHaveTextContent("apenas suas iniciais");
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByTestId("ranking-list")).toBeNull();
  });
  it("aceitar chama o cadastro", async () => {
    renderIt();
    fireEvent.click(await screen.findByText("Participar do ranking"));
    await waitFor(() => expect(api.join).toHaveBeenCalledTimes(1));
  });
  it("participante: posição, pontos e quanto falta; outros só por iniciais", async () => {
    api.member = true;
    renderIt();
    expect(await screen.findByTestId("my-position")).toHaveTextContent("2º");
    expect(screen.getByTestId("my-position")).toHaveTextContent("60 pontos");
    expect(screen.getByTestId("my-position")).toHaveTextContent("Faltam 30 pontos para subir");
    const list = screen.getByTestId("ranking-list");
    expect(list).toHaveTextContent("JP");
    expect(list).toHaveTextContent("Você");
    expect(list.textContent).not.toMatch(/Maria|João/);
  });
  it("trocar para Mês pede o período do mês", async () => {
    api.member = true;
    renderIt();
    await screen.findByTestId("my-position");
    fireEvent.click(screen.getByText("Mês"));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("month"));
  });
  it("sozinha: avisa que é a primeira, sem inventar concorrentes", async () => {
    api.member = true; api.rows = [row(1, "MS", 10, true)];
    renderIt();
    expect(await screen.findByRole("note")).toHaveTextContent("primeira a entrar");
  });
  it("erro ao carregar o ranking é dito, não vira lista vazia", async () => {
    api.member = true; api.rowsFail = true;
    renderIt();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
  });
  it("sair do ranking chama a saída", async () => {
    api.member = true;
    renderIt();
    fireEvent.click(await screen.findByText("Sair do ranking"));
    await waitFor(() => expect(api.leave).toHaveBeenCalledTimes(1));
  });
});
