import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  row: null as unknown, files: [] as unknown[],
  draft: vi.fn(async (_id: string, _a: Record<string, string>) => undefined), submit: vi.fn(async (_id: string, _a: Record<string, string>) => undefined),
  upload: vi.fn(async (_id: string, _f: File) => undefined), remove: vi.fn(async (_d: string) => undefined),
}));
vi.mock("@/lib/api/preConsulta", () => ({
  getMyPreConsulta: vi.fn(async () => api.row), getMyPreConsultaFiles: vi.fn(async () => api.files),
  savePreConsultaDraft: api.draft, submitPreConsulta: api.submit, uploadPreConsultaFile: api.upload, removePreConsultaFile: api.remove,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));

import PreConsulta from "./PreConsulta";

const Q = [{ id: "objetivo", label: "Qual é o seu objetivo?", type: "long" }, { id: "peso_atual", label: "Quanto você pesa?", type: "short" }];
const row = (o: object = {}) => ({ id: "pc1", appointment_starts_at: "2026-11-25T15:00:00Z", status: "enviada", questions: Q, answers: {}, sent_at: "2026-11-20T12:00:00Z", answered_at: null, ...o });
const view = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><PreConsulta /></MemoryRouter></QueryClientProvider>);

beforeEach(() => { api.row = row(); api.files = []; api.draft.mockClear(); api.submit.mockClear(); api.upload.mockClear(); api.remove.mockClear(); });

describe("Tela Pré-consulta (app do paciente)", () => {
  it("mostra as perguntas; salva rascunho com o que foi digitado", async () => {
    view();
    expect(await screen.findByText("Pré-consulta da sua consulta de 25/11")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/1\. Qual é o seu objetivo/), { target: { value: "Emagrecer" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(api.draft).toHaveBeenCalledWith("pc1", { objetivo: "Emagrecer" }));
    expect(await screen.findByText(/Rascunho salvo/)).toBeInTheDocument();
  });
  it("rascunho anterior volta preenchido", async () => {
    api.row = row({ status: "rascunho", answers: { objetivo: "Ganhar músculo" } });
    view();
    expect(await screen.findByDisplayValue("Ganhar músculo")).toBeInTheDocument();
  });
  it("envia as respostas e mostra confirmação", async () => {
    view();
    fireEvent.change(await screen.findByLabelText(/2\. Quanto você pesa/), { target: { value: "82 kg" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pré-consulta" }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith("pc1", { peso_atual: "82 kg" }));
    expect(await screen.findByText(/Pré-consulta enviada!/)).toBeInTheDocument();
  });
  it("anexa exame válido; recusa tipo errado sem chamar o servidor", async () => {
    view();
    const input = await screen.findByLabelText("Escolher exames");
    fireEvent.change(input, { target: { files: [new File(["x"], "exame.zip", { type: "application/zip" })] } });
    expect(await screen.findByText(/PDF ou foto/)).toBeInTheDocument();
    expect(api.upload).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(["x"], "hemograma.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(api.upload).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Exame anexado.")).toBeInTheDocument();
  });
  it("lista exames anexados e remove", async () => {
    api.files = [{ document_id: "d1", title: "Hemograma.pdf", file_path: "x", mime_type: "application/pdf" }];
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Remover Hemograma.pdf" }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("d1"));
  });
  it("já respondida: só leitura, sem enviar nem anexar", async () => {
    api.row = row({ status: "respondida", answered_at: "2026-11-21T15:00:00Z", answers: { objetivo: "Emagrecer" } });
    view();
    expect(await screen.findByText(/Você enviou em 21\/11/)).toBeInTheDocument();
    expect(screen.getByText("Emagrecer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar pré-consulta" })).toBeNull();
    expect(screen.queryByLabelText("Escolher exames")).toBeNull();
  });
  it("sem pedido: estado vazio", async () => {
    api.row = null;
    view();
    expect(await screen.findByText("Nenhuma pré-consulta para responder")).toBeInTheDocument();
  });
});
