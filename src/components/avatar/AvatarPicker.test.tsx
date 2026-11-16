import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));

import { AvatarPicker } from "./AvatarPicker";

function renderPicker(props: { savedKey?: string | null; savedBg?: string | null } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <AvatarPicker name="Beatriz Souza" savedKey={props.savedKey ?? null} savedBg={props.savedBg ?? null} />
    </QueryClientProvider>,
  );
  return { invalidate };
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe("AvatarPicker", () => {
  it("mostra 8 bichinhos, 5 cores e 'Salvar avatar' desligado até escolher", () => {
    renderPicker();
    expect(screen.getByText("Escolha um avatar")).toBeInTheDocument();
    expect(screen.getByText("Cor de fundo")).toBeInTheDocument();
    for (const n of ["Raposa", "Tigre", "Panda", "Coruja", "Coala", "Leão", "Pinguim", "Sapo"]) expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Cor de fundo #/ })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Salvar avatar" })).toBeDisabled();
  });

  it("salva a escolha no banco (RPC) e atualiza a identidade", async () => {
    const { invalidate } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Tigre" }));
    fireEvent.click(screen.getByRole("button", { name: "Cor de fundo #FFEDE8" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar avatar" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_my_avatar_pick", { p_key: "tigre", p_bg: "#FFEDE8" }));
    await waitFor(() => expect(screen.getByText("Avatar salvo.")).toBeInTheDocument());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  it("falha do banco mostra aviso e não diz que salvou", async () => {
    rpc.mockResolvedValue({ error: { message: "boom" } });
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Sapo" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar avatar" }));
    await waitFor(() => expect(screen.getByText("Não foi possível salvar o avatar. Tente novamente.")).toBeInTheDocument());
    expect(screen.queryByText("Avatar salvo.")).toBeNull();
  });

  it("já salvo e sem mudança: botão desligado; mudando a cor liga", () => {
    renderPicker({ savedKey: "panda", savedBg: "#EAF0FD" });
    expect(screen.getByRole("button", { name: "Panda" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Salvar avatar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cor de fundo #FEF5DC" }));
    expect(screen.getByRole("button", { name: "Salvar avatar" })).toBeEnabled();
  });
});
