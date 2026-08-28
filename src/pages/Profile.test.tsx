import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AdherenceState } from "@/lib/adherenceEngine";
import type { CareTeamMember } from "@/lib/api/types";
import type { Identity } from "@/hooks/useMe";
import { DISCIPLINE_NOT_INFORMED } from "@/lib/chatTeam";

const api = vi.hoisted(() => ({
  snapshot: null as AdherenceState | null,
  team: [] as CareTeamMember[],
  teamThrows: false,
  hang: false,
}));

vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => api.snapshot),
  getMyCareTeam: vi.fn(() => {
    if (api.hang) return new Promise<CareTeamMember[]>(() => {});
    if (api.teamThrows) return Promise.reject(new Error("boom"));
    return Promise.resolve(api.team);
  }),
}));

const identity = vi.hoisted(() => ({
  me: {} as Identity,
}));

vi.mock("@/hooks/useMe", () => ({ useMe: () => ({ me: identity.me, isLoading: false, isError: false }) }));
vi.mock("@/providers/auth-context", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const { default: Profile } = await import("./Profile");
const {
  NO_ACTIVE_LINK_TITLE,
  LINKED_NAME_UNAVAILABLE_TITLE,
  PROFESSIONAL_UNAVAILABLE_TITLE,
} = await import("@/components/NoPrescriptionYet");

function member(overrides: Partial<CareTeamMember> & Pick<CareTeamMember, "displayName">): CareTeamMember {
  return {
    professionalId: overrides.professionalId ?? `pro-${overrides.displayName ?? "x"}`,
    profileId: overrides.profileId ?? `pf-${overrides.displayName ?? "x"}`,
    displayName: overrides.displayName,
    avatarUrl: overrides.avatarUrl ?? null,
    type: overrides.type ?? null,
    specialty: overrides.specialty ?? null,
    disciplines: overrides.disciplines ?? [],
  };
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
  api.hang = false;
  identity.me = { ...MARIANA };
  navigate.mockClear();
});

describe("Perfil / Minha equipe (WP-09B2)", () => {
  it("T11: 1 profissional — nome real + qualificação, nunca Dra. Camila Rocha", async () => {
    api.team = [member({ displayName: "Bruno Salles", disciplines: ["educador_fisico"] })];
    renderProfile();

    expect(await screen.findByText("Bruno Salles")).toBeInTheDocument();
    expect(screen.getByText("Educador Físico")).toBeInTheDocument();
    expect(screen.getByText("Minha equipe")).toBeInTheDocument();
    expect(screen.queryByText("Dra. Camila Rocha")).not.toBeInTheDocument();
  });

  it("T12: múltiplos profissionais — todos representáveis, sem '+N'", async () => {
    api.team = [
      member({ displayName: "Ana Prado", disciplines: ["nutricionista"] }),
      member({ displayName: "Bruno Salles", disciplines: ["educador_fisico"] }),
      member({ displayName: "Clara Vieira", disciplines: ["medico"] }),
    ];
    renderProfile();

    expect(await screen.findByText("Ana Prado")).toBeInTheDocument();
    expect(screen.getByText("Bruno Salles")).toBeInTheDocument();
    expect(screen.getByText("Clara Vieira")).toBeInTheDocument();
    expect(screen.queryByText(/Ana Prado \+2/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
  });

  it("T10: zero equipe — empty state de ausência, não um nome de exemplo", async () => {
    api.team = [];
    renderProfile();

    expect(await screen.findByText(NO_ACTIVE_LINK_TITLE)).toBeInTheDocument();
    expect(screen.queryByText("Dra. Camila Rocha")).not.toBeInTheDocument();
  });

  it("T13: equipe retornada sem canal — profissionais aparecem (a tela não pergunta por canal)", async () => {
    api.team = [
      member({ displayName: "Ana Prado", disciplines: ["nutricionista"] }),
      member({ displayName: "Bruno Salles", disciplines: ["educador_fisico"] }),
    ];
    renderProfile();

    expect(await screen.findByText("Ana Prado")).toBeInTheDocument();
    expect(screen.getByText("Bruno Salles")).toBeInTheDocument();
    expect(screen.queryByText(LINKED_NAME_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });

  it("T14: avatar null — iniciais como fallback", async () => {
    api.team = [member({ displayName: "Bruno Salles", avatarUrl: null, disciplines: ["educador_fisico"] })];
    renderProfile();

    expect(await screen.findByText("Bruno Salles")).toBeInTheDocument();
    expect(screen.getByText("BS")).toBeInTheDocument();
  });

  it("T15: qualificação disciplines → specialty → type", async () => {
    api.team = [
      member({
        displayName: "Dra. Ana",
        disciplines: ["medico"],
        specialty: "Endocrinologia",
        type: "doctor",
      }),
      member({
        displayName: "Dra. Bia",
        professionalId: "pro-bia",
        profileId: "pf-bia",
        disciplines: [],
        specialty: "Endocrinologia",
        type: "doctor",
      }),
      member({
        displayName: "Carlos",
        professionalId: "pro-carlos",
        profileId: "pf-carlos",
        disciplines: [],
        specialty: null,
        type: "personal_trainer",
      }),
      member({
        displayName: "Dana",
        professionalId: "pro-dana",
        profileId: "pf-dana",
        disciplines: [],
        specialty: null,
        type: null,
      }),
    ];
    renderProfile();

    expect(await screen.findByText("Dra. Ana")).toBeInTheDocument();
    expect(screen.getByText("Médico")).toBeInTheDocument();
    expect(screen.getByText("Endocrinologia")).toBeInTheDocument();
    expect(screen.getByText("Educador Físico")).toBeInTheDocument();
    expect(screen.getByText(DISCIPLINE_NOT_INFORMED)).toBeInTheDocument();
  });

  it("T16: não mostra o workaround 'nome indisponível' de canal", async () => {
    api.team = [];
    renderProfile();
    await screen.findByText(NO_ACTIVE_LINK_TITLE);

    expect(screen.queryByText(LINKED_NAME_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(/você tem profissional vinculado ao seu cadastro/i)).not.toBeInTheDocument();
    expect(screen.queryByText(PROFESSIONAL_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });

  it("falha na RPC: diz que falhou e oferece tentar de novo — não mascara como equipe vazia", async () => {
    api.teamThrows = true;
    renderProfile();

    expect(await screen.findByText(/não foi possível carregar sua equipe/i)).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
    expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
  });

  it("enquanto carrega, não afirma equipe vazia", () => {
    api.hang = true;
    renderProfile();
    expect(screen.getByText("Minha equipe")).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
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

  it("sem snapshot: nenhum VRI e nenhuma sequência inventados", async () => {
    api.snapshot = null;
    renderProfile();

    await screen.findByText(NO_ACTIVE_LINK_TITLE);

    expect(screen.queryByText("VRI")).not.toBeInTheDocument();
    expect(screen.queryByText("Sequência")).not.toBeInTheDocument();
    expect(screen.queryByText("95%")).not.toBeInTheDocument();
  });
});

describe("Perfil / itens de menu (WP-APP-6 item 3.3)", () => {
  it("os itens sem destino saíram da lista", async () => {
    renderProfile();
    await screen.findByText(NO_ACTIVE_LINK_TITLE);

    expect(screen.queryByText("Configurações")).not.toBeInTheDocument();
    expect(screen.queryByText("Privacidade")).not.toBeInTheDocument();
  });

  it("Notificações continua e agora LEVA a /notifications", async () => {
    renderProfile();
    await screen.findByText(NO_ACTIVE_LINK_TITLE);

    const item = screen.getByText("Notificações").closest("button");
    expect(item).not.toBeNull();
    fireEvent.click(item!);
    expect(navigate).toHaveBeenCalledWith("/notifications");
  });

  it("Meu objetivo mostra o valor real, e deixou de ser botão", async () => {
    renderProfile();
    await screen.findByText(NO_ACTIVE_LINK_TITLE);

    expect(screen.getByText("Emagrecimento")).toBeInTheDocument();
    expect(screen.getByText("Meu objetivo").closest("button")).toBeNull();
  });

  it("sem objetivo no cadastro, a linha inteira some — rótulo sozinho não é informação", async () => {
    identity.me = { ...MARIANA, goal: "" };
    renderProfile();
    await screen.findByText(NO_ACTIVE_LINK_TITLE);

    expect(screen.queryByText("Meu objetivo")).not.toBeInTheDocument();
  });

  it("Minha equipe com membros também deixou de ser botão", async () => {
    api.team = [member({ displayName: "Bruno Salles", disciplines: ["educador_fisico"] })];
    renderProfile();
    await screen.findByText("Bruno Salles");

    expect(screen.getByText("Minha equipe").closest("button")).toBeNull();
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

    await screen.findByText(NO_ACTIVE_LINK_TITLE);
    expect(screen.queryByText(/paciente desde/i)).not.toBeInTheDocument();
  });
});

describe("Perfil / depois da desativação do profissional (WP-FRONT-2bii-B item 3)", () => {
  it("TODOS desativados: a RPC devolve [] e a tela afirma ausência de equipe", async () => {
    api.team = [];
    renderProfile();

    expect(await screen.findByText(NO_ACTIVE_LINK_TITLE)).toBeInTheDocument();
  });

  it("UM de dois desativado: ela continua vendo o NOME do colega, sem texto de ausência", async () => {
    api.team = [member({ displayName: "Dr. Colega Fica", disciplines: ["fisioterapeuta"] })];
    renderProfile();

    expect(await screen.findByText("Dr. Colega Fica")).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(LINKED_NAME_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });
});
