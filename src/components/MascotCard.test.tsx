import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  water: 1.5 as number | undefined,
  meals: { done: 5, total: 5 } as { done: number; total: number } | null,
  plan: [{ letter: "B" }] as unknown[],
  pending: { workoutPending: false } as unknown,
  streak: 3 as number | null,
  supplements: [] as { id: string }[],
  taken: new Set<string>(),
  brand: null as null | { name: string; color: string | null; logoUrl: null },
  weight: 62.4, // dado clínico que existe no app: a fala NUNCA pode usar
}));

vi.mock("@/lib/api", () => ({
  getHydrationTodayLiters: vi.fn(async () => api.water),
  getMealAdherenceToday: vi.fn(async () => api.meals),
  getMyWorkoutPlan: vi.fn(async () => api.plan),
  getPendingSummary: vi.fn(async () => api.pending),
  getLatestAdherenceState: vi.fn(async () => (api.streak === null ? null : { streak: api.streak })),
  getMySupplements: vi.fn(async () => api.supplements),
  getSupplementsTakenToday: vi.fn(async () => api.taken),
  getMyClinicBrand: vi.fn(async () => api.brand),
  getRecentWeightLogs: vi.fn(async () => [{ weight_kg: api.weight }]),
}));

import { accessibleAccent, APP_ACCENT } from "@/lib/mascot/brandAccent";

import MascotCard from "./MascotCard";

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MascotCard />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.water = 1.5;
  api.meals = { done: 5, total: 5 };
  api.plan = [{ letter: "B" }];
  api.pending = { workoutPending: false };
  api.streak = 3;
  api.supplements = [];
  api.taken = new Set();
  api.brand = null;
});

describe("MascotCard — tigrezinho", () => {
  it("falta a água: fala da meta e mostra a sequência; nada de peso", async () => {
    renderCard();
    await waitFor(() => expect(screen.getByTestId("mascot-line")).toHaveTextContent("Falta a água para fechar o dia."));
    expect(screen.getByText("3 dias seguidos")).toBeInTheDocument();
    expect(screen.getByText("2 de 3 metas de hoje")).toBeInTheDocument();
    expect(screen.getByTestId("mascot-card").textContent).not.toMatch(/peso|kg|62/i);
  });

  it("tudo feito: 'Dia fechado!'", async () => {
    api.water = 2.5;
    renderCard();
    await waitFor(() => expect(screen.getByTestId("mascot-line")).toHaveTextContent("Dia fechado!"));
  });

  it("meta sem dado some: sem plano de refeição e sem treino, só a água é citada", async () => {
    api.meals = null;
    api.plan = [];
    renderCard();
    await waitFor(() => expect(screen.getByTestId("mascot-line")).toHaveTextContent("Falta a água para fechar o dia."));
    expect(screen.getByText("0 de 1 meta de hoje")).toBeInTheDocument();
  });

  it("remédios entram quando há cadastro, e some a sequência quando não há", async () => {
    api.water = 2.5;
    api.streak = null;
    api.supplements = [{ id: "s1" }, { id: "s2" }];
    api.taken = new Set(["s1"]);
    renderCard();
    await waitFor(() => expect(screen.getByTestId("mascot-line")).toHaveTextContent("Faltam os remédios para fechar o dia."));
    expect(screen.queryByText(/dias? seguidos?/)).toBeNull();
  });

  it("sem cor da clínica: laranja do app", async () => {
    renderCard();
    await waitFor(() => expect(screen.getByTestId("mascot-line")).toHaveTextContent("Falta a água"));
    expect(screen.getByTestId("mascot-card")).toHaveAttribute("data-accent", APP_ACCENT);
  });

  it("usa a cor da clínica no card (e a imagem recortada em 50% 38%)", async () => {
    api.brand = { name: "Clínica Ápice", color: "#1A7F5A", logoUrl: null };
    renderCard();
    await waitFor(() => expect(screen.getByTestId("mascot-line")).toHaveTextContent("Falta a água"));
    const card = screen.getByTestId("mascot-card");
    expect(card).toHaveAttribute("data-accent", accessibleAccent("#1A7F5A"));
    expect(card.getAttribute("data-accent")).not.toBe(APP_ACCENT);
    const img = screen.getByTestId("mascot-image") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("50% 38%");
  });
});
