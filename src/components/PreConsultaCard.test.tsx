import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ row: null as unknown }));
vi.mock("@/lib/api/preConsulta", () => ({ getMyPreConsulta: vi.fn(async () => api.row) }));

import PreConsultaCard from "./PreConsultaCard";

const row = (o: object) => ({ id: "1", appointment_starts_at: "2026-11-25T15:00:00Z", status: "enviada", questions: [], answers: {}, sent_at: "2026-11-20T12:00:00Z", answered_at: null, ...o });
const view = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><Routes><Route path="/" element={<PreConsultaCard />} /><Route path="/pre-consulta" element={<p>TELA RESPONDER</p>} /></Routes></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-22T12:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("Cartão Pré-consulta no Início (A1)", () => {
  it("pedido pendente: título com a data e abre a tela de responder", async () => {
    api.row = row({});
    view();
    fireEvent.click(await screen.findByRole("button", { name: /Pré-consulta da sua consulta de 25\/11/ }));
    expect(await screen.findByText("TELA RESPONDER")).toBeInTheDocument();
  });
  it("depois de enviada vira 'Pré-consulta enviada'", async () => {
    api.row = row({ status: "respondida", answered_at: "2026-11-21T12:00:00Z" });
    view();
    expect(await screen.findByText("Pré-consulta enviada")).toBeInTheDocument();
  });
  it("sem pedido ou cancelado: não desenha nada", async () => {
    api.row = null;
    const { container } = view();
    await Promise.resolve();
    expect(container.querySelector("button")).toBeNull();
  });
});
