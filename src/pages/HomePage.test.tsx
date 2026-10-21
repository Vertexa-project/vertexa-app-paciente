import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AdherenceState } from "@/lib/adherenceEngine";

const SNAPSHOT: AdherenceState = {
  score: 74,
  level: "moderada",
  status: "em_acompanhamento",
  journeyPhase: "inicio",
  daysSinceLastInteraction: 0,
  streak: 2,
  weeklyCompletionRate: 40,
  riskFactors: [],
  positiveFactors: [],
  contextualMessage: "Bom ritmo.",
  lastScoreChange: 0,
};

const api = vi.hoisted(() => ({
  snapshot: null as unknown,
  adherenceThrows: false,
  workouts: [] as unknown[],
  pending: null as unknown,
}));

vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => {
    if (api.adherenceThrows) throw new Error("boom");
    return api.snapshot;
  }),
  getPendingSummary: vi.fn(async () => api.pending),
  getHydrationTodayLiters: vi.fn(async () => 0),
  getMyClinicBrand: vi.fn(async () => null),
  getMySupplements: vi.fn(async () => []),
  getSupplementsTakenToday: vi.fn(async () => new Set()),
  toggleSupplementTaken: vi.fn(),
  getMyWorkoutPlan: vi.fn(async () => api.workouts),
  getRecentWeightLogs: vi.fn(async () => []),
  getMealAdherenceToday: vi.fn(async () => null),
}));

vi.mock("@/hooks/useMe", () => ({
  useMe: () => ({
    me: {
      name: "Mariana", fullName: "Mariana Lopes", avatar: "", goal: "",
      currentWeight: null, startWeight: null, targetWeight: null, startDate: null,
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useUnreadNotificationCount: () => ({ count: 0 }),
  useNotifications: () => ({ notifications: [], unreadCount: 0, isLoading: false, isError: false, markRead: vi.fn(), markAllRead: vi.fn() }),
}));

const { default: HomePage } = await import("./HomePage");
const { VRI_NOT_AVAILABLE_TITLE, VRI_NOT_AVAILABLE_MESSAGE } = await import(
  "@/components/NoPrescriptionYet"
);

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.snapshot = SNAPSHOT;
  api.adherenceThrows = false;
  api.workouts = [];
  api.pending = null;
});

describe("Home / barra semanal (WP-APP-4 item 1)", () => {
  // Eram `weeklyProgress.days` (mockData.ts): Seg 90, Ter 85, Qua 70, Qui 75, Sex 60, Sáb/Dom 0.
  // Literais versionados, iguais para toda paciente — e coladas no anel do VRI, que é real.
  it("não há mais caixinhas Seg→Dom no card do VRI", async () => {
    renderHome();
    expect(await screen.findByText("74%")).toBeInTheDocument();

    for (const day of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) {
      expect(screen.queryByText(day)).not.toBeInTheDocument();
    }
  });

  it("nenhum dos scores literais do mock aparece", async () => {
    renderHome();
    await screen.findByText("74%");

    for (const score of ["90", "85", "70", "75", "60"]) {
      expect(screen.queryByText(score)).not.toBeInTheDocument();
    }
  });

  // A remoção é da barra MOCK — o VRI real (snapshot do servidor) continua onde estava.
  it("o VRI real e a sequência continuam de pé", async () => {
    renderHome();
    expect(await screen.findByText("74%")).toBeInTheDocument();
    expect(screen.getByText("2 dias de sequência")).toBeInTheDocument();
  });
});

// WP-APP-6 item 3.2. Sem snapshot, a Home caía em getAdherenceState() -> DEFAULT_CONFIG e
// exibia 95% / "Alta adesão" / "+3" / "18 dias de sequência" / "Você está arrasando! 🔥" /
// "Você está incrível! Sua adesão está excelente" — para quem nunca registrou nada.
// Medido em produção: 6 das 7 pacientes caem neste caminho hoje.
describe("Home / sem snapshot de adesão (WP-APP-6 item 3.2)", () => {
  it("nenhum número do DEFAULT_CONFIG aparece", async () => {
    api.snapshot = null;
    renderHome();

    expect(await screen.findByText(VRI_NOT_AVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText("95%")).not.toBeInTheDocument();
    expect(screen.queryByText("18 dias de sequência")).not.toBeInTheDocument();
    expect(screen.queryByText(/60% da semana/)).not.toBeInTheDocument();
    expect(screen.queryByText("+3")).not.toBeInTheDocument();
    expect(screen.queryByText("Alta adesão")).not.toBeInTheDocument();
  });

  it("nenhuma frase de coaching derivada de score inexistente", async () => {
    api.snapshot = null;
    renderHome();
    await screen.findByText(VRI_NOT_AVAILABLE_TITLE);

    expect(screen.queryByText(/você está arrasando/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/você está incrível/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sua adesão está excelente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/excelente! sua constância/i)).not.toBeInTheDocument();
  });

  it("nem status quase-clínico nem fase da jornada — mas 'Ver jornada' fica", async () => {
    api.snapshot = null;
    renderHome();
    await screen.findByText(VRI_NOT_AVAILABLE_TITLE);

    expect(screen.queryByText("Em acompanhamento")).not.toBeInTheDocument();
    expect(screen.queryByText("Acompanhamento ativo")).not.toBeInTheDocument();
    // navegação real, não deriva de state
    expect(screen.getByText(/ver jornada/i)).toBeInTheDocument();
  });

  it("o estado vazio não culpa a paciente", async () => {
    api.snapshot = null;
    renderHome();
    await screen.findByText(VRI_NOT_AVAILABLE_TITLE);

    expect(screen.getByText(VRI_NOT_AVAILABLE_MESSAGE)).toBeInTheDocument();
    // `null` também acontece quando o patients.id dela não resolve — mandar "registre seus
    // hábitos" poria nela um conserto que pode não ser dela.
    expect(VRI_NOT_AVAILABLE_MESSAGE).not.toMatch(/registre|você precisa|comece a/i);
  });
});

// WP-APP-7 item 2.2. `adherenceStateFromSnapshot` faz `prevScore === undefined ? 0 : delta`,
// e a RPC só grava novo snapshot quando o score ou o nível MUDAM — então "+0" com seta de
// ALTA em VERDE era o que toda paciente via na PRIMEIRA medição real dela.
describe("Home / pílula de variação do VRI (WP-APP-7 item 2.2)", () => {
  it("sem variação anterior (delta 0): nenhuma pílula, nem '+0'", async () => {
    api.snapshot = { ...SNAPSHOT, lastScoreChange: 0 };
    renderHome();
    await screen.findByText("74%");

    expect(screen.queryByText("+0")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("com alta real: pílula com '+N'", async () => {
    api.snapshot = { ...SNAPSHOT, lastScoreChange: 5 };
    renderHome();
    await screen.findByText("74%");

    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  // A seta era TrendingUp inclusive para queda: vermelha, mas apontando para cima.
  it("com queda real: mostra o número negativo, sem o '+'", async () => {
    api.snapshot = { ...SNAPSHOT, lastScoreChange: -4 };
    renderHome();
    await screen.findByText("74%");

    expect(screen.getByText("-4")).toBeInTheDocument();
    expect(screen.queryByText("+-4")).not.toBeInTheDocument();
  });
});

// Antes deste WP o ERRO caía no MESMO `??` do caso vazio e virava 95% "Alta adesão":
// a falha se disfarçava de saúde, sem sinal nenhum.
describe("Home / falha ao ler a adesão (WP-APP-6 item 3.2)", () => {
  it("diz que falhou e oferece tentar de novo — não vira índice saudável", async () => {
    api.adherenceThrows = true;
    renderHome();

    expect(await screen.findByText(/não foi possível carregar seu índice vri/i)).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    expect(screen.queryByText("95%")).not.toBeInTheDocument();
  });

  it("falha NÃO é o mesmo que 'ainda não há índice'", async () => {
    api.adherenceThrows = true;
    renderHome();
    await screen.findByText(/não foi possível carregar seu índice vri/i);

    expect(screen.queryByText(VRI_NOT_AVAILABLE_TITLE)).not.toBeInTheDocument();
  });
});

// PDF do Ernâni (tela 01): cards logo abaixo do VRI, próxima ação e "Registro rápido" no lugar do elogio.
describe("Home / ordem e blocos do design (PDF do Ernâni, tela 01)", () => {
  it("mostra os cards de sequência e de semana concluída com dado real", async () => {
    renderHome();
    const cards = await screen.findByTestId("home-stat-cards");
    expect(cards).toHaveTextContent("2 dias");
    expect(cards).toHaveTextContent("40%");
  });

  it("sem snapshot não há cards (nada de número inventado)", async () => {
    api.snapshot = null;
    renderHome();
    await screen.findByText(VRI_NOT_AVAILABLE_TITLE);
    expect(screen.queryByTestId("home-stat-cards")).not.toBeInTheDocument();
  });

  it("'Próxima ação' só com ficha e treino pendente", async () => {
    api.workouts = [{ id: "w", letter: "E", name: "Bíceps / Tríceps", dayIndex: new Date().getDay(), exercises: [], estimatedMinutes: 50, estimatedCalories: 0, completed: false, muscleGroup: "", dayOfWeek: "" }];
    api.pending = { workoutPending: true, photoPending: false, weightPending: false };
    renderHome();
    expect(await screen.findByTestId("home-next-action")).toHaveTextContent("Treino E — Bíceps / Tríceps");
  });

  it("com ficha mas treino já feito hoje: sem 'Próxima ação'", async () => {
    api.workouts = [{ id: "w", letter: "E", name: "X", dayIndex: new Date().getDay(), exercises: [], estimatedMinutes: 50, estimatedCalories: 0, completed: false, muscleGroup: "", dayOfWeek: "" }];
    api.pending = { workoutPending: false, photoPending: false, weightPending: false };
    renderHome();
    await screen.findByTestId("home-stat-cards");
    expect(screen.queryByTestId("home-next-action")).not.toBeInTheDocument();
  });

  it("sem ficha não há 'Próxima ação'", async () => {
    api.pending = { workoutPending: true, photoPending: false, weightPending: false };
    renderHome();
    await screen.findByTestId("home-stat-cards");
    expect(screen.queryByTestId("home-next-action")).not.toBeInTheDocument();
  });

  it("'Registro rápido' e 'Tarefas de hoje' substituem os nomes antigos; sem elogio automático", async () => {
    api.snapshot = { ...SNAPSHOT, score: 92, level: "alta" };
    renderHome();
    expect(await screen.findByText("Registro rápido")).toBeInTheDocument();
    expect(screen.getByText("Tarefas de hoje")).toBeInTheDocument();
    expect(screen.queryByText("Ações rápidas")).not.toBeInTheDocument();
    expect(screen.queryByText(/você está incrível/i)).not.toBeInTheDocument();
  });
});

describe("Home / sino abre painel (PDF do Ernâni, tela 02)", () => {
  it("tocar no sino abre o painel sobre a Home", async () => {
    renderHome();
    await screen.findByTestId("home-stat-cards");
    expect(screen.queryByText("Nenhuma notificação por aqui")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir notificações" }));
    expect(await screen.findByText("Nenhuma notificação por aqui")).toBeInTheDocument();
  });
});

describe("Home / VRI abre a tela de detalhe (PDF do Ernâni, tela 14)", () => {
  it("o card do VRI é um botão para o detalhe", async () => {
    renderHome();
    expect(await screen.findByRole("button", { name: "Ver detalhes do índice VRI" })).toBeInTheDocument();
  });
});
