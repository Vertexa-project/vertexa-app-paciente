import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ exp: vi.fn(), get: vi.fn(), ask: vi.fn(), cancel: vi.fn() }));
vi.mock("@/lib/api", () => ({ exportMyData: api.exp, getMyDeletionRequest: api.get, requestAccountDeletion: api.ask, cancelAccountDeletion: api.cancel }));
import AccountRights from "./AccountRights";

const renderIt = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AccountRights /></QueryClientProvider>);
beforeEach(() => {
  api.exp.mockReset().mockResolvedValue({ perfil: {} }); api.get.mockReset().mockResolvedValue(null); api.ask.mockReset().mockResolvedValue(undefined); api.cancel.mockReset().mockResolvedValue(undefined);
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:x";
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
});

describe("AccountRights", () => {
  it("exportar baixa um arquivo e avisa", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    renderIt();
    fireEvent.click(screen.getByText("Exportar meus dados"));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent("Seus dados foram baixados.");
    click.mockRestore();
  });
  it("falha ao exportar não finge que baixou", async () => {
    api.exp.mockRejectedValue(new Error("x"));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    renderIt();
    fireEvent.click(screen.getByText("Exportar meus dados"));
    expect(await screen.findByRole("status")).toHaveTextContent("Não foi possível baixar");
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });
  it("excluir exige confirmar: o 1º toque só explica o que acontece", async () => {
    renderIt();
    fireEvent.click(screen.getByText("Excluir minha conta"));
    expect(api.ask).not.toHaveBeenCalled();
    expect(screen.getByText(/ficam na clínica, sem identificação/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Voltar"));
    expect(screen.getByText("Excluir minha conta")).toBeInTheDocument();
  });
  it("confirmar envia o pedido", async () => {
    renderIt();
    fireEvent.click(screen.getByText("Excluir minha conta"));
    fireEvent.click(screen.getByText("Pedir exclusão"));
    await waitFor(() => expect(api.ask).toHaveBeenCalledTimes(1));
  });
  it("com pedido em aberto mostra a data e permite cancelar; não oferece pedir de novo", async () => {
    api.get.mockResolvedValue("2026-10-20T12:00:00Z");
    renderIt();
    expect(await screen.findByText(/Você pediu para excluir sua conta em/)).toBeInTheDocument();
    expect(screen.queryByText("Excluir minha conta")).toBeNull();
    fireEvent.click(screen.getByText("Cancelar pedido"));
    await waitFor(() => expect(api.cancel).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toHaveTextContent("Pedido cancelado");
  });
});
