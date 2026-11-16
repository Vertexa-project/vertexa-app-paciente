import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ list: [] as unknown[], throws: false, open: vi.fn(async () => "https://x/signed") }));
vi.mock("@/lib/api", () => ({
  getMyDeliveries: vi.fn(async () => { if (api.throws) throw new Error("x"); return api.list; }),
  openDelivery: api.open,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));

import Documents from "./Documents";

const d = (id: string, extra: object = {}) => ({ id, kind: "treino", title: `Treino · Ficha ${id}`, file_path: `p/${id}.pdf`, mime_type: "application/pdf", file_size_bytes: 200 * 1024, sent_at: "2026-11-17T01:30:00Z", first_opened_at: null, sender_name: "Dr. Edu", ...extra });
const view = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Documents /></MemoryRouter></QueryClientProvider>);

beforeEach(() => { api.list = []; api.throws = false; api.open.mockClear(); });

describe("Meus documentos (app do paciente)", () => {
  it("lista o que a clínica enviou: tipo, data de Brasília, quem enviou, tamanho e etiqueta Novo", async () => {
    api.list = [d("1"), d("2", { kind: "plano_alimentar", title: "Plano alimentar · Plano de teste (QA)", first_opened_at: "2026-11-18T10:00:00Z" })];
    view();
    expect(await screen.findByText("Treino · Ficha 1")).toBeInTheDocument();
    expect(screen.getAllByText("Novo")).toHaveLength(1);
    expect(screen.getByText(/Treino · 16\/11\/2026 · Dr\. Edu · 200 KB/)).toBeInTheDocument();
    expect(screen.getByText(/Plano alimentar · 16\/11\/2026/)).toBeInTheDocument();
  });
  it("sem envio: estado vazio em português; erro: aviso com tentar de novo", async () => {
    const { unmount } = view();
    expect(await screen.findByText("Nenhum documento ainda")).toBeInTheDocument();
    unmount();
    api.throws = true;
    view();
    expect(await screen.findByText(/Não foi possível carregar seus documentos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
  it("tocar abre o arquivo pela URL assinada (e entrega o item ao registro de visto)", async () => {
    api.list = [d("1")];
    view();
    fireEvent.click(await screen.findByRole("button", { name: /Treino · Ficha 1/ }));
    await waitFor(() => expect(api.open).toHaveBeenCalledTimes(1));
    expect(api.open.mock.calls[0][0]).toMatchObject({ id: "1", file_path: "p/1.pdf", first_opened_at: null });
  });
  it("falha ao abrir: mensagem, sem quebrar a lista", async () => {
    api.list = [d("1")];
    api.open.mockRejectedValueOnce(new Error("sign"));
    view();
    fireEvent.click(await screen.findByRole("button", { name: /Treino · Ficha 1/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir o documento. Tente novamente.");
    expect(screen.getByText("Treino · Ficha 1")).toBeInTheDocument();
  });
});
