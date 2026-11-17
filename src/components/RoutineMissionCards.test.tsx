import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  routine: null as unknown, mission: null as unknown,
  log: vi.fn(async () => undefined), upload: vi.fn(async () => undefined), celebrated: vi.fn(async () => undefined),
}));
vi.mock("@/lib/api/routine", () => ({
  getMyRoutine: vi.fn(async () => api.routine), getMyMission: vi.fn(async () => api.mission),
  logRoutineEntry: api.log, uploadRoutinePhoto: api.upload, markMissionCelebrated: api.celebrated,
}));
vi.mock("@/lib/api/photos", () => ({ ProgressPhotoValidationError: class extends Error {} }));
import RoutineMissionCards from "./RoutineMissionCards";

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
function renderCards() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/home"]}>
        <Routes><Route path="/home" element={<RoutineMissionCards />} /><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => { vi.clearAllMocks(); api.routine = { enabled: false, source: "clinic_off", current: [] }; api.mission = { enabled: false, started: false }; });

describe("Início · cartão da rotina (A4)", () => {
  it("clínica desligada: nenhum cartão", async () => {
    const { container } = renderCards();
    await waitFor(() => expect(api.routine).toBeTruthy());
    await new Promise((r) => setTimeout(r, 30));
    expect(container.textContent).toBe("");
  });
  it("sexta: 'Rotina de sexta: foto da balança em jejum, como foi a semana' e botões para registrar", async () => {
    api.routine = { enabled: true, source: "clinic", current: [
      { key: "weight", label: "Peso (balança em jejum)", due_on: "2026-11-20", state: "due_today" },
      { key: "feedback", label: "Feedback da semana", due_on: "2026-11-20", state: "due_today" }] };
    renderCards();
    expect(await screen.findByTestId("routine-title")).toHaveTextContent("Rotina de sexta: foto da balança em jejum, como foi a semana");
    fireEvent.click(screen.getByRole("button", { name: "Registrar peso" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/records?tab=weight");
  });
  it("atrasado aparece com a data; foto leva a Registros > Foto", async () => {
    api.routine = { enabled: true, source: "clinic", current: [{ key: "photo", label: "Foto", due_on: "2026-11-13", state: "overdue" }] };
    renderCards();
    expect(await screen.findByText("Atrasado · 13/11")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar foto" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/records?tab=photo");
  });
  it("feedback: só envia com texto e grava como 'feedback'", async () => {
    api.routine = { enabled: true, source: "clinic", current: [{ key: "feedback", label: "Feedback da semana", due_on: "2026-11-20", state: "due_today" }] };
    renderCards();
    const send = await screen.findByRole("button", { name: "Enviar feedback" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Como foi a sua semana?"), { target: { value: "  Semana boa!  " } });
    fireEvent.click(send);
    await waitFor(() => expect(api.log).toHaveBeenCalledWith("feedback", "Semana boa!"));
  });
});

const step = (key: string, label: string, done: boolean, allow_skip = false) => ({ key, label, allow_skip, done, done_on: done ? "2026-11-17" : null });
const mission = (over: Record<string, unknown> = {}) => ({
  enabled: true, started: true, days: 7, ends_on: "2026-11-24", done_count: 1, total: 4, completed: false, celebrated: false,
  steps: [step("photo_front", "Foto de frente", true), step("weight", "Peso na balança, em jejum", false), step("supplements_photo", "Foto dos suplementos", false, true), step("bio", "Bioimpedância (se você tiver)", false, true)], ...over,
});

describe("Início · Missão da 1ª semana (A5)", () => {
  it("mostra progresso x de y e cada passo pendente leva à tela certa", async () => {
    api.mission = mission();
    renderCards();
    expect(await screen.findByTestId("mission-progress")).toHaveTextContent("1 de 4 passos feitos");
    expect(screen.getByRole("progressbar", { name: "Progresso da missão" })).toHaveAttribute("aria-valuenow", "1");
    fireEvent.click(screen.getByRole("button", { name: "Fazer agora" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/records?tab=weight");
    expect(screen.queryByTestId("mission-celebration")).toBeNull();
  });
  it("suplementos: envia a foto pelo próprio cartão; bio: 'Não tenho' registra e some a pergunta", async () => {
    api.mission = mission();
    renderCards();
    const input = await screen.findByLabelText("Enviar foto: Foto dos suplementos");
    const file = new File([new Uint8Array(4)], "sup.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(api.upload).toHaveBeenCalledWith("supplements_photo", file));
    fireEvent.click(screen.getByRole("button", { name: "Não tenho" }));
    await waitFor(() => expect(api.log).toHaveBeenCalledWith("bio_na"));
  });
  it("concluída e ainda não vista: abre o 'parabéns' uma vez e marca como mostrado", async () => {
    api.mission = mission({ done_count: 4, completed: true, completed_on: "2026-11-17", celebrated: false, steps: [step("weight", "Peso", true)] });
    renderCards();
    expect(await screen.findByTestId("mission-celebration")).toBeInTheDocument();
    expect(screen.getAllByTestId("confetti-piece").length).toBeGreaterThanOrEqual(20);
    await waitFor(() => expect(api.celebrated).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(screen.queryByTestId("mission-celebration")).toBeNull());
  });
  it("já vista: sem 'parabéns'; só o cartão compacto concluído", async () => {
    api.mission = mission({ done_count: 4, completed: true, completed_on: new Date().toISOString().slice(0, 10), celebrated: true });
    renderCards();
    expect(await screen.findByTestId("mission-progress")).toHaveTextContent(/Missão concluída em/);
    expect(screen.queryByTestId("mission-celebration")).toBeNull();
    expect(api.celebrated).not.toHaveBeenCalled();
  });
  it("paciente que ainda não começou ou clínica sem missão: nenhum cartão", async () => {
    api.mission = { enabled: true, started: false };
    const { container } = renderCards();
    await new Promise((r) => setTimeout(r, 30));
    expect(container.textContent).toBe("");
  });
});

describe("Efeito do 'parabéns' sempre ligado (sem respeitar reduced-motion)", () => {
  const tigerTransform = () => (screen.getByTestId("celebration-tiger") as HTMLElement).style.transform;
  const run = async (reduce: boolean) => {
    window.matchMedia = ((q: string) => ({ matches: reduce && q.includes("prefers-reduced-motion"), media: q, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
    api.mission = mission({ done_count: 4, completed: true, completed_on: "2026-11-17", celebrated: false });
    const { unmount } = renderCards();
    await screen.findByTestId("mission-celebration");
    const frames = new Set<string>();
    for (let i = 0; i < 8; i++) { await act(async () => { await new Promise((r) => setTimeout(r, 80)); }); frames.add(tigerTransform()); }
    unmount();
    return frames;
  };
  it("com movimento normal o tigrezinho anima (quadros diferentes)", async () => { expect((await run(false)).size).toBeGreaterThan(2); });
  it("com 'reduzir movimento' do sistema ligado, anima do mesmo jeito", async () => { expect((await run(true)).size).toBeGreaterThan(2); });
});
