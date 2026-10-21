import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const m = vi.hoisted(() => ({
  logWeight: vi.fn(async () => ({})),
  track: vi.fn(),
  last: null as { weight_kg: number; measured_at: string } | null,
  review: [] as { id: string; weight_kg: number; measured_at: string; review_status: string }[],
}));

vi.mock("@/lib/api", () => ({
  logSleep: vi.fn(),
  getRecentSleep: vi.fn(async () => []),
  logWeight: m.logWeight,
  getRecentWeightLogs: vi.fn(async () => (m.last ? [m.last] : [])),
  getWeightsInReview: vi.fn(async () => m.review),
  logHydration: vi.fn(),
  uploadProgressPhoto: vi.fn(),
  getLatestProgressPhoto: vi.fn(async () => null),
  getRecentPoseShots: vi.fn(async () => []),
  getMyWorkoutPlan: vi.fn(async () => []),
  validateProgressPhotoFile: vi.fn(),
  ProgressPhotoValidationError: class extends Error {},
}));
vi.mock("@/lib/eventTracker", () => ({ tracker: { track: m.track } }));

const { default: Records } = await import("./Records");

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function renderRecords() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><Records /></MemoryRouter></QueryClientProvider>);
}

async function typeWeight(value: string) {
  const input = (await screen.findByPlaceholderText("0.0")) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => { m.logWeight.mockClear(); m.track.mockClear(); m.last = { weight_kg: 117, measured_at: daysAgo(2) }; m.review = []; });

describe("Registrar peso — conferência antes de salvar (PDF do Ernâni, tela 03)", () => {
  it("117 → 108 em dois dias NÃO grava: pede confirmação com os números", async () => {
    renderRecords();
    await waitFor(() => expect(screen.getByPlaceholderText("0.0")).toHaveValue(117));
    await typeWeight("108");
    fireEvent.click(screen.getByText("Salvar registro"));
    expect(await screen.findByRole("alertdialog", { name: "Conferir peso" })).toHaveTextContent("117,0 kg");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("108,0 kg");
    expect(m.logWeight).not.toHaveBeenCalled();
  });

  it("'Corrigir' fecha o aviso sem gravar", async () => {
    renderRecords();
    await waitFor(() => expect(screen.getByPlaceholderText("0.0")).toHaveValue(117));
    await typeWeight("108");
    fireEvent.click(screen.getByText("Salvar registro"));
    fireEvent.click(await screen.findByText("Corrigir"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(m.logWeight).not.toHaveBeenCalled();
  });

  it("'Confirmar' grava, mas valor fora da curva NÃO emite o marcador do VRI", async () => {
    renderRecords();
    await waitFor(() => expect(screen.getByPlaceholderText("0.0")).toHaveValue(117));
    await typeWeight("108");
    fireEvent.click(screen.getByText("Salvar registro"));
    fireEvent.click(await screen.findByText("Confirmar 108,0 kg"));
    await waitFor(() => expect(m.logWeight).toHaveBeenCalledWith({ weightKg: 108, suspect: true }));
    expect(m.track).not.toHaveBeenCalledWith("weight_logged", expect.anything());
  });

  it("variação normal grava direto e conta no VRI", async () => {
    renderRecords();
    await waitFor(() => expect(screen.getByPlaceholderText("0.0")).toHaveValue(117));
    await typeWeight("116.2");
    fireEvent.click(screen.getByText("Salvar registro"));
    await waitFor(() => expect(m.logWeight).toHaveBeenCalledWith({ weightKg: 116.2, suspect: false }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(m.track).toHaveBeenCalledWith("weight_logged", { source: "app" }));
  });

  it("primeiro registro (sem histórico) grava direto", async () => {
    m.last = null;
    renderRecords();
    await typeWeight("90");
    fireEvent.click(screen.getByText("Salvar registro"));
    await waitFor(() => expect(m.logWeight).toHaveBeenCalledWith({ weightKg: 90, suspect: false }));
  });

  it("histórico mostra o peso 'em análise da equipe' e o 'não aceito', fora da lista normal", async () => {
    m.review = [
      { id: "r1", weight_kg: 58, measured_at: daysAgo(0), review_status: "pending" },
      { id: "r2", weight_kg: 40, measured_at: daysAgo(1), review_status: "rejected" },
    ];
    renderRecords();
    const rows = await screen.findAllByTestId("weight-in-review");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("58.0kg · em análise da equipe");
    expect(rows[1]).toHaveTextContent("40.0kg · não aceito pela equipe");
  });
});
