import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// A tela consulta peso/foto/ficha ao montar. O que está sob teste é a aba SONO, então a camada de
// dados é substituída por respostas resolvidas — sem rede, sem depender de seed.
const logSleep = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  logSleep,
  getRecentSleep: vi.fn(async () => []),
  logWeight: vi.fn(),
  getRecentWeightLogs: vi.fn(async () => []),
  logHydration: vi.fn(),
  uploadProgressPhoto: vi.fn(),
  getLatestProgressPhoto: vi.fn(async () => null),
  getRecentPoseShots: vi.fn(async () => []),
  getMyWorkoutPlan: vi.fn(async () => []),
  validateProgressPhotoFile: vi.fn(),
  ProgressPhotoValidationError: class extends Error {},
}));

const { default: Records } = await import("./Records");
const { NOTES_LOCK_REASON } = await import("@/components/ComingSoonLock");

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

describe("Registros / aba Sono — registro real (WP-SLEEP-A)", () => {
  it("mostra o formulário (horas, dia, qualidade e Salvar), sem cadeado", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));
    expect(await screen.findByText("Registrar sono")).toBeInTheDocument();
    expect(screen.getByLabelText("Horas dormidas")).toBeInTheDocument();
    expect(screen.getByLabelText("Dia em que você acordou")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.queryByText("Em breve")).not.toBeInTheDocument();
  });

  it("salva exatamente o que foi digitado (vírgula, qualidade escolhida) e confirma só depois de gravar", async () => {
    logSleep.mockResolvedValue(undefined);
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));
    const input = await screen.findByLabelText("Horas dormidas");
    fireEvent.change(input, { target: { value: "6,5" } });
    fireEvent.click(screen.getByRole("radio", { name: "Boa" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(logSleep).toHaveBeenCalledTimes(1));
    expect(logSleep.mock.calls[0][0]).toMatchObject({ hours: 6.5, quality: 4 });
    expect(await screen.findByText("Sono registrado!")).toBeInTheDocument();
  });

  it("horas inválidas não gravam e avisam", async () => {
    logSleep.mockClear();
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));
    const input = await screen.findByLabelText("Horas dormidas");
    fireEvent.change(input, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText(/entre 0,5 e 24/)).toBeInTheDocument();
    expect(logSleep).not.toHaveBeenCalled();
  });

  it("falha do servidor mostra erro e NÃO confirma", async () => {
    logSleep.mockRejectedValue(new Error("boom"));
    renderRecords();
    fireEvent.click(screen.getByText("Sono"));
    await screen.findByLabelText("Horas dormidas");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Não foi possível registrar o sono.")).toBeInTheDocument();
    expect(screen.queryByText("Sono registrado!")).not.toBeInTheDocument();
  });
});

describe("Registros / aba Obs. — cadeado no lugar do textarea (WP-APP-6 item 3.1)", () => {
  it("mostra o cadeado com texto PRÓPRIO, não o de integração com aparelho", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Obs."));

    expect(await screen.findByText(NOTES_LOCK_REASON)).toBeInTheDocument();
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
