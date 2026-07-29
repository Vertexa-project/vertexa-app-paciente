import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// A tela consulta peso/foto/ficha ao montar. O que está sob teste é a aba SONO, então a camada de
// dados é substituída por respostas resolvidas — sem rede, sem depender de seed.
vi.mock("@/lib/api", () => ({
  logWeight: vi.fn(),
  getRecentWeightLogs: vi.fn(async () => []),
  logHydration: vi.fn(),
  uploadProgressPhoto: vi.fn(),
  getLatestProgressPhoto: vi.fn(async () => null),
  getMyWorkoutPlan: vi.fn(async () => []),
  validateProgressPhotoFile: vi.fn(),
  ProgressPhotoValidationError: class extends Error {},
}));

const { default: Records } = await import("./Records");
const { SLEEP_LOCK_REASON, NOTES_LOCK_REASON } = await import("@/components/ComingSoonLock");

function renderRecords() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Records />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Registros / aba Sono — cadeado no lugar do formulário (WP-APP-4 item 5)", () => {
  it("mostra o cadeado, com o MESMO texto da Home e de Hábitos", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));

    expect(await screen.findByText(SLEEP_LOCK_REASON)).toBeInTheDocument();
    expect(screen.getByText("Em breve")).toBeInTheDocument();
  });

  // O defeito não era exibir mock: era ACEITAR o registro, descartar o valor e confirmar.
  // Sem campo e sem botão, não há o que descartar nem o que confirmar.
  it("não há formulário de sono: nem campo de horas, nem botão de salvar", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));
    await screen.findByText(SLEEP_LOCK_REASON);

    expect(screen.queryByText("Registrar sono")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument();
  });

  // O cadeado é bloco informativo, não botão — não recebe foco nem promete ação (regra do
  // componente). Se alguém trocar a <div> por <button>, este teste cai.
  it("o cadeado de sono não é interativo", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));
    await screen.findByText(SLEEP_LOCK_REASON);

    expect(
      screen.queryByRole("button", { name: /Sono — em breve/ }),
    ).not.toBeInTheDocument();
  });
});

describe("Registros / aba Obs. — cadeado no lugar do textarea (WP-APP-6 item 3.1)", () => {
  it("mostra o cadeado com texto PRÓPRIO, não o de integração com aparelho", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Obs."));

    expect(await screen.findByText(NOTES_LOCK_REASON)).toBeInTheDocument();
    // a razão aqui é outra: o registro não existe no produto, não falta relógio
    expect(screen.queryByText(SLEEP_LOCK_REASON)).not.toBeInTheDocument();
    expect(NOTES_LOCK_REASON).not.toBe(SLEEP_LOCK_REASON);
  });

  // O defeito: textarea sem estado, conteúdo descartado, e o botão respondendo
  // "Observação salva!". Sem campo e sem botão, não há o que descartar nem o que confirmar.
  it("não há textarea nem botão de salvar, e a confirmação falsa sumiu", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Obs."));
    await screen.findByText(NOTES_LOCK_REASON);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/escreva suas observações/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument();
    expect(screen.queryByText("Observação salva!")).not.toBeInTheDocument();
  });

  it("o cadeado de observações não é interativo", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Obs."));
    await screen.findByText(NOTES_LOCK_REASON);

    expect(
      screen.queryByRole("button", { name: /Observações — em breve/ }),
    ).not.toBeInTheDocument();
  });
});
