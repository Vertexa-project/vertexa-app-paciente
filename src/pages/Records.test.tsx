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
const { SLEEP_LOCK_REASON } = await import("@/components/ComingSoonLock");

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
  it("o cadeado não é interativo", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));
    await screen.findByText(SLEEP_LOCK_REASON);

    expect(
      screen.queryByRole("button", { name: /Sono — em breve/ }),
    ).not.toBeInTheDocument();
  });
});
