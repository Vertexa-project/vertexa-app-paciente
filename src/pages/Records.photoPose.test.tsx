import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ uploadProgressPhoto: vi.fn(async () => ({ url: "x", row: {} })) }));
vi.mock("@/lib/api", () => ({
  logWeight: vi.fn(),
  getRecentWeightLogs: vi.fn(async () => []),
  logHydration: vi.fn(),
  uploadProgressPhoto: api.uploadProgressPhoto,
  getLatestProgressPhoto: vi.fn(async () => null),
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
