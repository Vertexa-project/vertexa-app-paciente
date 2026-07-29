import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AdherenceState } from "@/lib/adherenceEngine";
import type { ChannelProfessional } from "@/lib/api/types";
import type { Identity } from "@/hooks/useMe";

const api = vi.hoisted(() => ({
  snapshot: null as AdherenceState | null,
  team: [] as ChannelProfessional[],
  teamThrows: false,
}));

vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => api.snapshot),
  listMyCareTeam: vi.fn(async () => {
    if (api.teamThrows) throw new Error("boom");
    return api.team;
  }),
}));

const identity = vi.hoisted(() => ({
  me: {} as Identity,
}));

vi.mock("@/hooks/useMe", () => ({ useMe: () => ({ me: identity.me, isLoading: false, isError: false }) }));
vi.mock("@/providers/auth-context", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

const { default: Profile } = await import("./Profile");
const { PROFESSIONAL_UNAVAILABLE_TITLE, PROFESSIONAL_UNAVAILABLE_MESSAGE } = await import(
  "@/components/NoPrescriptionYet"
);

function prof(name: string): ChannelProfessional {
  return { profileId: `p-${name}`, name, specialty: null, type: null, disciplines: [] };
}

const MARIANA: Identity = {
  name: "Mariana",
  fullName: "Mariana Lopes",
  avatar: "",
  goal: "Emagrecimento",
  currentWeight: 78.4,
  startWeight: 78.4,
  targetWeight: 68,
  startDate: "2026-04-14",
};

function renderProfile() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.snapshot = null;
  api.team = [];
  api.teamThrows = false;
  identity.me = { ...MARIANA };
});

describe("Perfil / profissional responsável (WP-APP-4 item 2)", () => {
  it("exibe o nome REAL vindo da equipe, e nunca a Dra. Camila Rocha", async () => {
    api.team = [prof("Bruno Salles")];
    renderProfile();

    expect(await screen.findByText("Bruno Salles")).toBeInTheDocument();
    expect(screen.queryByText("Dra. Camila Rocha")).not.toBeInTheDocument();
  });

  // Produção: Mariana tem dois vínculos ativos. A tela não elege um como "o" responsável.
  it("com dois vínculos, mostra o primeiro e conta o resto", async () => {
    api.team = [prof("Ana Prado"), prof("Bruno Salles")];
    renderProfile();

    expect(await screen.findByText("Ana Prado +1")).toBeInTheDocument();
  });

  it("sem equipe na leitura: estado vazio honesto, não um nome de exemplo", async () => {
    api.team = [];
    renderProfile();

    expect(await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE)).toBeInTheDocument();
  });

  // O estado vazio NÃO PODE AFIRMAR que ela não tem profissional. O nome sai da RPC
  // channel_professionals, que depende de um chat_channels criado por get_or_create_channel —
  // função que o app do PACIENTE nunca chama. Quem cria o canal é o profissional, ao abrir a
  // conversa. Paciente nova, com vínculo ATIVO de verdade, cai neste ramo.
  it("o texto vazio fala de DISPONIBILIDADE, nunca de ausência de vínculo", async () => {
    api.team = [];
    renderProfile();
    await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE);

    // nega explicitamente a inferência errada
    expect(screen.getByText(/não quer dizer que você não tenha um profissional/i)).toBeInTheDocument();
    // e não afirma o contrário em nenhuma formulação
    expect(screen.queryByText(/ainda não vinculad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/você não tem (um )?profissional/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sem profissional/i)).not.toBeInTheDocument();
  });

  // Guarda no texto em si, independente de render: se alguém reescrever a constante para uma
  // afirmação sobre o cadastro dela, cai aqui.
  it("a constante não contém afirmação sobre o vínculo", () => {
    expect(PROFESSIONAL_UNAVAILABLE_TITLE).toMatch(/não disponível/i);
    expect(PROFESSIONAL_UNAVAILABLE_TITLE).not.toMatch(/vinculad|não tem|sem profissional/i);
    expect(PROFESSIONAL_UNAVAILABLE_MESSAGE).not.toMatch(/vincular|vinculad/i);
  });

  // Falha de leitura NÃO é "você não tem profissional" — a segunda é uma afirmação, e falsa.
  it("falha na leitura: diz que falhou e oferece tentar de novo", async () => {
    api.teamThrows = true;
    renderProfile();

    expect(await screen.findByText(/não foi possível carregar seu profissional/i)).toBeInTheDocument();
    expect(screen.queryByText(PROFESSIONAL_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });
});

describe("Perfil / VRI e sequência (WP-APP-4 item 2)", () => {
  const SNAPSHOT: AdherenceState = {
    score: 74,
    level: "moderada",
    status: "em_acompanhamento",
    journeyPhase: "inicio",
    daysSinceLastInteraction: 0,
    streak: 2,
    weeklyCompletionRate: 0,
    riskFactors: [],
    positiveFactors: [],
    contextualMessage: "",
    lastScoreChange: 0,
  };

  it("com snapshot real: mostra o número do snapshot", async () => {
    api.snapshot = SNAPSHOT;
    renderProfile();

    expect(await screen.findByText("74%")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // Antes: `getAdherenceState()` sem argumento -> DEFAULT_CONFIG (streak 18, 3 treinos...) -> 95%,
  // renderizado como o índice DELA. Sem snapshot não há índice, e o bloco inteiro não aparece.
  it("sem snapshot: nenhum VRI e nenhuma sequência inventados", async () => {
    api.snapshot = null;
    renderProfile();

    // a leitura da equipe resolvendo garante que as queries já assentaram
    await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE);

    expect(screen.queryByText("VRI")).not.toBeInTheDocument();
    expect(screen.queryByText("Sequência")).not.toBeInTheDocument();
    expect(screen.queryByText("95%")).not.toBeInTheDocument();
  });
});

describe("Perfil / 'Paciente desde' (WP-APP-4 item 2)", () => {
  it("usa patients.start_date, não a data fixa do mock (jan/2025)", async () => {
    renderProfile();

    expect(await screen.findByText(/paciente desde abril de 2026/i)).toBeInTheDocument();
  });

  it("sem start_date no cadastro, a linha não é exibida", async () => {
    identity.me = { ...MARIANA, startDate: null };
    renderProfile();

    await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE);
    expect(screen.queryByText(/paciente desde/i)).not.toBeInTheDocument();
  });
});
