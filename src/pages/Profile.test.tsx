import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AdherenceState } from "@/lib/adherenceEngine";
import type { ChannelProfessional } from "@/lib/api/types";
import type { Identity } from "@/hooks/useMe";

const api = vi.hoisted(() => ({
  snapshot: null as AdherenceState | null,
  team: [] as ChannelProfessional[],
  teamThrows: false,
  // WP-APP-7 2.4: nº de vínculos ativos. `null` = não deu para saber.
  activeLinks: null as number | null,
  linksThrows: false,
}));

vi.mock("@/lib/api", () => ({
  getLatestAdherenceState: vi.fn(async () => api.snapshot),
  listMyCareTeam: vi.fn(async () => {
    if (api.teamThrows) throw new Error("boom");
    return api.team;
  }),
  countMyActiveProfessionalLinks: vi.fn(async () => {
    if (api.linksThrows) throw new Error("boom");
    return api.activeLinks;
  }),
}));

const identity = vi.hoisted(() => ({
  me: {} as Identity,
}));

vi.mock("@/hooks/useMe", () => ({ useMe: () => ({ me: identity.me, isLoading: false, isError: false }) }));
vi.mock("@/providers/auth-context", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

// `navigate` espionado para provar que a seta do item de menu leva mesmo a algum lugar.
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const { default: Profile } = await import("./Profile");
const {
  PROFESSIONAL_UNAVAILABLE_TITLE,
  PROFESSIONAL_UNAVAILABLE_MESSAGE,
  LINKED_NAME_UNAVAILABLE_TITLE,
  NO_ACTIVE_LINK_TITLE,
} = await import("@/components/NoPrescriptionYet");

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
  api.activeLinks = null;
  api.linksThrows = false;
  identity.me = { ...MARIANA };
  navigate.mockClear();
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

// WP-APP-7 item 2.4 — sem nome, a tela diz QUAL das duas ausências é.
describe("Perfil / as duas ausências do profissional (WP-APP-7 item 2.4)", () => {
  it("com vínculo ativo e sem nome: diz que TEM vínculo, sem prometer o nome", async () => {
    api.team = [];
    api.activeLinks = 2;
    renderProfile();

    expect(await screen.findByText(LINKED_NAME_UNAVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(/você tem profissional vinculado ao seu cadastro/i)).toBeInTheDocument();
    // não é o texto de "não sabemos", nem o de ausência
    expect(screen.queryByText(PROFESSIONAL_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
  });

  // Vínculo EXTERNO não entra no roster nunca (get_or_create_channel o deleta), então este
  // ramo não pode prometer que o nome vai chegar.
  it("o texto de 'tem vínculo' não promete chegada nem prazo", async () => {
    api.team = [];
    api.activeLinks = 1;
    renderProfile();
    await screen.findByText(LINKED_NAME_UNAVAILABLE_TITLE);

    expect(screen.queryByText(/em breve|assim que|aparece aqui em/i)).not.toBeInTheDocument();
  });

  it("sem vínculo ativo nenhum: aí sim afirma a ausência", async () => {
    api.team = [];
    api.activeLinks = 0;
    renderProfile();

    expect(await screen.findByText(NO_ACTIVE_LINK_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(LINKED_NAME_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });

  // As duas ausências viram UMA só quando o app não sabe — e aí ele não afirma nenhuma.
  it("não deu para saber (sem patients.id): volta ao texto neutro", async () => {
    api.team = [];
    api.activeLinks = null;
    renderProfile();

    expect(await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
  });

  it("falha ao ler os vínculos: neutro, nunca 'não há vínculo'", async () => {
    api.team = [];
    api.linksThrows = true;
    renderProfile();

    expect(await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
  });

  // Precedência: o nome do roster ganha de tudo. Sem isso, o Perfil poderia dizer "não há
  // vínculo" enquanto o chat lista a pessoa e ela continua podendo escrever para essa pessoa.
  it("quando há NOME, os textos de ausência não aparecem nem se os vínculos derem zero", async () => {
    api.team = [prof("Bruno Salles")];
    api.activeLinks = 0;
    renderProfile();

    expect(await screen.findByText("Bruno Salles")).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(LINKED_NAME_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });
});

// WP-APP-6 item 3.3 — "ou levam a algum lugar, ou deixam de parecer que levam".
describe("Perfil / itens de menu (WP-APP-6 item 3.3)", () => {
  it("os itens sem destino saíram da lista", async () => {
    renderProfile();
    await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE);

    expect(screen.queryByText("Configurações")).not.toBeInTheDocument();
    expect(screen.queryByText("Privacidade")).not.toBeInTheDocument();
  });

  it("Notificações continua e agora LEVA a /notifications", async () => {
    renderProfile();
    await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE);

    const item = screen.getByText("Notificações").closest("button");
    expect(item).not.toBeNull();
    fireEvent.click(item!);
    expect(navigate).toHaveBeenCalledWith("/notifications");
  });

  // Exibe patients.goal, que é real — por isso fica. Mas não pode levar a lugar nenhum: a
  // policy patients_update não tem is_self_patient, e nenhuma RPC escreve goal para ela.
  it("Meu objetivo mostra o valor real, e deixou de ser botão", async () => {
    renderProfile();
    await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE);

    expect(screen.getByText("Emagrecimento")).toBeInTheDocument();
    expect(screen.getByText("Meu objetivo").closest("button")).toBeNull();
  });

  it("sem objetivo no cadastro, a linha inteira some — rótulo sozinho não é informação", async () => {
    identity.me = { ...MARIANA, goal: "" };
    renderProfile();
    await screen.findByText(PROFESSIONAL_UNAVAILABLE_TITLE);

    expect(screen.queryByText("Meu objetivo")).not.toBeInTheDocument();
  });

  // Eu mesmo introduzi este <button> com seta e sem onClick no WP-APP-4.
  it("Profissional responsável com nome também deixou de ser botão", async () => {
    api.team = [prof("Bruno Salles")];
    renderProfile();
    await screen.findByText("Bruno Salles");

    expect(screen.getByText("Profissional responsável").closest("button")).toBeNull();
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// WP-FRONT-2bii-B item 3 — VERIFICAÇÃO (nada foi reimplementado aqui).
//
// A pergunta do WP: depois da cascata do WP-TEAM-2b-ii, QUAL das duas ausências a paciente vê, e
// o texto continua verdadeiro? Os três cenários abaixo são os do banco, medidos em transação
// antes de escrever teste nenhum:
//   · TODOS os profissionais dela desativados → roster vazio E 0 vínculos ativos
//   · UM de dois desativado                   → o colega continua no roster (ela vê o nome dele)
//   · vínculo ativo fora do roster (externo)  → roster vazio, mas vínculos ativos > 0
// A tela já distinguia os três desde o WP-APP-7. Estes testes FIXAM a distinção para o cenário
// novo, que antes não existia — desativação de profissional.
// ─────────────────────────────────────────────────────────────────────────────────────────────
describe("Perfil / depois da desativação do profissional (WP-FRONT-2bii-B item 3)", () => {
  it("TODOS desativados: cai em 'nenhum vínculo' — e agora isso é VERDADE (0 vínculos ativos)", async () => {
    api.team = []; // a cascata tirou todo mundo do roster
    api.activeLinks = 0; // e os vínculos viraram histórico de verdade
    renderProfile();

    expect(await screen.findByText(NO_ACTIVE_LINK_TITLE)).toBeInTheDocument();
    // O texto neutro (que existe para quando o app NÃO sabe) não pode aparecer: aqui ele sabe.
    expect(screen.queryByText(PROFESSIONAL_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });

  it("UM de dois desativado: ela continua vendo o NOME do colega, sem nenhum texto de ausência", async () => {
    api.team = [prof("Dr. Colega Fica")]; // o roster perdeu só quem saiu
    api.activeLinks = 1;
    renderProfile();

    expect(await screen.findByText("Dr. Colega Fica")).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(LINKED_NAME_UNAVAILABLE_TITLE)).not.toBeInTheDocument();
  });

  it("vínculo ativo fora do roster: diz que TEM vínculo, e não afirma ausência", async () => {
    api.team = []; // sem nome (ex.: só vínculo externo, excluído do roster de propósito)
    api.activeLinks = 1;
    renderProfile();

    expect(await screen.findByText(LINKED_NAME_UNAVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(NO_ACTIVE_LINK_TITLE)).not.toBeInTheDocument();
  });
});
