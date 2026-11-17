import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({
  logWeight: vi.fn(), getRecentWeightLogs: vi.fn(async () => []), getWeightsInReview: vi.fn(async () => []), logHydration: vi.fn(),
  uploadProgressPhoto: vi.fn(), getLatestProgressPhoto: vi.fn(async () => null), getRecentPoseShots: vi.fn(async () => []),
  getMyWorkoutPlan: vi.fn(async () => []), validateProgressPhotoFile: vi.fn(), ProgressPhotoValidationError: class extends Error {},
}));
const { default: Records } = await import("./Records");

const open = (url: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[url]}><Records /></MemoryRouter>
  </QueryClientProvider>,
);

describe("Registros abre no passo certo quando vem da rotina/missão (A4/A5)", () => {
  it("?tab=photo&pose=side abre a aba Foto com Lado escolhido", async () => {
    open("/records?tab=photo&pose=side");
    expect(await screen.findByText("Foto evolutiva")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Lado" })).toBeChecked();
  });
  it("?tab=weight (e sem parâmetro) abre o peso", async () => {
    open("/records?tab=weight");
    expect(await screen.findByText("Registrar peso")).toBeInTheDocument();
  });
  it("pose inválida é ignorada", async () => {
    open("/records?tab=photo&pose=de-ponta-cabeca");
    await screen.findByText("Foto evolutiva");
    expect(screen.getByRole("radio", { name: "Frente" })).not.toBeChecked();
  });
});
