import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ uploadProgressPhoto: vi.fn(async () => ({ url: "x", row: {} })), shots: [] as { pose: string | null; taken_at: string }[] }));
vi.mock("@/lib/api", () => ({
  logWeight: vi.fn(),
  getRecentWeightLogs: vi.fn(async () => []),
  logHydration: vi.fn(),
  uploadProgressPhoto: api.uploadProgressPhoto,
  getLatestProgressPhoto: vi.fn(async () => null),
  getRecentPoseShots: vi.fn(async () => api.shots),
  getMyWorkoutPlan: vi.fn(async () => []),
  validateProgressPhotoFile: vi.fn(),
  ProgressPhotoValidationError: class extends Error {},
}));

const { default: Records } = await import("./Records");

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

async function openPhotoTabWithFile() {
  fireEvent.click(screen.getByText("Foto"));
  await screen.findByText("Foto evolutiva");
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(10)], "eu.jpg", { type: "image/jpeg" });
  Object.defineProperty(URL, "createObjectURL", { value: () => "blob:x", configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: () => undefined, configurable: true });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByText("eu.jpg");
  return file;
}

beforeEach(() => api.uploadProgressPhoto.mockClear());

describe("Registros / foto evolutiva — posição obrigatória (WP-PHOTOS-A)", () => {
  it("oferece frente, lado e costas, e o envio fica bloqueado até escolher a posição", async () => {
    renderRecords();
    await openPhotoTabWithFile();
    expect(screen.getByRole("radio", { name: "Frente" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Lado" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Costas" })).toBeInTheDocument();
    expect((screen.getByRole("button", { name: "Enviar foto" }) as HTMLButtonElement).disabled).toBe(true);
    expect(api.uploadProgressPhoto).not.toHaveBeenCalled();
  });

  it("com a posição escolhida, envia o arquivo COM a posição", async () => {
    renderRecords();
    const file = await openPhotoTabWithFile();
    fireEvent.click(screen.getByRole("radio", { name: "Costas" }));
    expect(screen.getByRole("radio", { name: "Costas" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Enviar foto" }));
    await waitFor(() => expect(api.uploadProgressPhoto).toHaveBeenCalledTimes(1));
    expect(api.uploadProgressPhoto).toHaveBeenCalledWith(file, "back");
  });
});

// PDF do Ernâni, tela 05: guia de pose com check, próxima sugerida, dicas e privacidade.
describe("Foto evolutiva / guia de pose (PDF do Ernâni, tela 05)", () => {
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  beforeEach(() => { api.shots = []; });

  it("sem fotos: sugere a frente, sem check, com dicas e privacidade", async () => {
    renderRecords();
    fireEvent.click(screen.getByText("Foto"));
    expect(await screen.findByTestId("pose-series-line")).toHaveTextContent("Nenhuma foto ainda · próxima sugerida: Frente");
    expect(screen.queryByLabelText("já fotografada nesta semana")).not.toBeInTheDocument();
    expect(screen.getByTestId("pose-tips")).toHaveTextContent("Mesmo lugar, mesma luz");
    expect(screen.getByText("Visível só para você e sua equipe")).toBeInTheDocument();
  });

  it("frente e costas da semana: check nas duas e a próxima é o lado", async () => {
    api.shots = [{ pose: "front", taken_at: daysAgo(1) }, { pose: "back", taken_at: daysAgo(1) }];
    renderRecords();
    fireEvent.click(screen.getByText("Foto"));
    await vi.waitFor(() => expect(screen.getByTestId("pose-series-line")).toHaveTextContent("próxima sugerida: Lado"));
    expect(screen.getAllByLabelText("já fotografada nesta semana")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: /Frente/ })).toContainElement(screen.getAllByLabelText("já fotografada nesta semana")[0]);
  });

  it("série completa: avisa que está completa", async () => {
    api.shots = ["front", "side", "back"].map((pose) => ({ pose, taken_at: daysAgo(2) }));
    renderRecords();
    fireEvent.click(screen.getByText("Foto"));
    await vi.waitFor(() => expect(screen.getByTestId("pose-series-line")).toHaveTextContent("série da semana completa"));
  });
});
