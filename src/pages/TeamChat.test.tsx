import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ChannelProfessional, ChatMessageView } from "@/lib/api/types";

/**
 * WP-FRONT-2bii-B item 2 — OS DOIS SENTIDOS, NA TELA.
 *
 * O cenário é UM só, e é o que acontece quando a clínica desativa um profissional (WP-TEAM-2b-ii):
 * a cascata o tira do ROSTER do canal, mas as mensagens que ele escreveu continuam lá. Medido em
 * produção antes de escrever qualquer código: nesse instante o embed `sender:profiles(full_name)`
 * da mensagem antiga passa a chegar NULO para a paciente, porque o ramo R4 de
 * `private.can_see_profile` exige VÍNCULO ATIVO.
 *
 * Daí as duas asserções que se opõem, e que este arquivo trava juntas:
 *   · a bolha antiga TEM de continuar dizendo "Dra. Alvo Silva"  (lista COM autores)
 *   · o seletor de @ e a equipe do topo NÃO podem oferecê-la     (lista do ROSTER)
 * Um teste só que provasse um lado deixaria o outro livre para regredir — e as duas regressões
 * são silenciosas: ou some o nome do histórico, ou a paciente marca quem não atende mais.
 */

const CHANNEL = "c8000000-0000-0000-0000-0000000000a1";
const P_SAIU = "aa000000-0000-0000-0000-00000000dead";
const P_FICA = "bb000000-0000-0000-0000-00000000beef";

const SAIU: ChannelProfessional = {
  profileId: P_SAIU,
  name: "Dra. Alvo Silva",
  specialty: null,
  type: "nutritionist",
  disciplines: ["nutricionista"],
};
const FICA: ChannelProfessional = {
  profileId: P_FICA,
  name: "Dr. Colega Fica",
  specialty: null,
  type: "physiotherapist",
  disciplines: ["fisioterapeuta"],
};

// O que a RPC devolve DEPOIS da desativação, em cada uma das duas perguntas.
const ROSTER_DEPOIS = [FICA];
const AUTORES_DEPOIS = [FICA, SAIU];

const api = vi.hoisted(() => ({
  calls: [] as { channelId: string; includeAuthors: boolean }[],
  roster: [] as unknown[],
  authors: [] as unknown[],
  messages: [] as unknown[],
}));

vi.mock("@/lib/api", () => ({
  getMyChannel: vi.fn(async () => ({ id: CHANNEL, patient_id: "pat-1" })),
  getMyCareTeam: vi.fn(async () => {
    throw new Error("TeamChat must not call getMyCareTeam");
  }),
  getMessagesByIds: vi.fn(async () => []),
  listChannelProfessionals: vi.fn(async (channelId: string, includeAuthors = false) => {
    api.calls.push({ channelId, includeAuthors });
    return includeAuthors ? api.authors : api.roster;
  }),
  sendPatientMessage: vi.fn(async () => ({
    id: "m-novo",
    mentionFailed: false,
    mentionFailureReason: null,
  })),
}));

vi.mock("@/hooks/useChannelMessages", () => ({
  useChannelMessages: () => ({
    data: api.messages,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/eventTracker", () => ({ tracker: { track: vi.fn() } }));
vi.mock("@/lib/observability/sentry", () => ({ captureException: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => vi.fn(),
}));

const { default: TeamChat } = await import("./TeamChat");

// jsdom não implementa scrollIntoView, e a tela chama isso a cada mensagem nova. Mesma classe de
// lacuna do `matchMedia` já polifilado em src/test/setup.ts — resolvido AQUI para não mexer no
// setup compartilhado por causa de uma tela só.
Element.prototype.scrollIntoView = vi.fn();

/** Mensagem ANTIGA de quem saiu: o embed do remetente já chega NULO (é o que a RLS faz). */
function mensagemDeQuemSaiu(): ChatMessageView {
  return {
    id: "m-antiga",
    channelId: CHANNEL,
    body: "Bom dia! Segue o ajuste do plano.",
    createdAt: "2026-07-01T12:00:00Z",
    senderProfileId: P_SAIU,
    senderRole: "professional",
    senderName: null,
    isOwn: false,
    attachmentPath: null,
    attachmentName: null,
    attachmentMime: null,
    attachmentSize: null,
    replyToMessageId: null,
  } as ChatMessageView;
}

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TeamChat />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.calls = [];
  api.roster = ROSTER_DEPOIS;
  api.authors = AUTORES_DEPOIS;
  api.messages = [mensagemDeQuemSaiu()];
});

describe("TeamChat — as DUAS chamadas da RPC", () => {
  it("faz as duas perguntas, uma com autores e outra sem", async () => {
    renderChat();
    await waitFor(() => expect(api.calls.length).toBeGreaterThanOrEqual(2));
    expect(api.calls.some((c) => c.includeAuthors === false)).toBe(true);
    expect(api.calls.some((c) => c.includeAuthors === true)).toBe(true);
    expect(api.calls.every((c) => c.channelId === CHANNEL)).toBe(true);
  });
});

describe("SENTIDO 1 — quem escreveu isto: o nome SOBREVIVE à saída da pessoa", () => {
  it("a bolha antiga mostra o nome de quem já saiu da clínica", async () => {
    renderChat();
    // Sem a lista COM autores, este texto seria o genérico "Profissional".
    expect(await screen.findByText("Dra. Alvo Silva")).toBeInTheDocument();
  });

  it("e mostra a disciplina dela, que só a RPC traz", async () => {
    renderChat();
    expect(await screen.findByText("· Nutricionista")).toBeInTheDocument();
  });

  // A REGRESSÃO SIMÉTRICA 1: se o índice do autor viesse do ROSTER, o nome sumiria.
  it("se a lista de autores voltar sem ela, a bolha cai para o genérico (é o defeito que isto evita)", async () => {
    api.authors = ROSTER_DEPOIS; // simula alimentar o autor com o roster
    renderChat();
    expect(await screen.findByText("Profissional")).toBeInTheDocument();
    expect(screen.queryByText("Dra. Alvo Silva")).not.toBeInTheDocument();
  });
});

describe("SENTIDO 2 — quem cuida de mim: a desativada NÃO é oferecida", () => {
  it("o seletor de @ lista só quem ficou", async () => {
    renderChat();
    await screen.findByText("Dra. Alvo Silva"); // a tela já carregou

    const input = screen.getByPlaceholderText(/mensagem/i);
    fireEvent.change(input, { target: { value: "@" } });

    const seletor = await screen.findByText("Direcionar para a equipe:");
    const menu = seletor.closest("div")?.parentElement as HTMLElement;
    expect(within(menu).getByText("Dr. Colega Fica")).toBeInTheDocument();
    expect(within(menu).queryByText("Dra. Alvo Silva")).not.toBeInTheDocument();
  });

  // A REGRESSÃO SIMÉTRICA 2: se o seletor bebesse da lista COM autores, ofereceria quem saiu —
  // e a marcação seria recusada pelo banco (chat_mentions_insert exige participante do canal).
  it("se o roster voltar COM autores, o seletor passa a oferecer quem saiu (o que não pode)", async () => {
    api.roster = AUTORES_DEPOIS; // simula alimentar o seletor com a lista de autores
    renderChat();
    const input = await screen.findByPlaceholderText(/mensagem/i);
    fireEvent.change(input, { target: { value: "@" } });

    const seletor = await screen.findByText("Direcionar para a equipe:");
    const menu = seletor.closest("div")?.parentElement as HTMLElement;
    expect(within(menu).getByText("Dra. Alvo Silva")).toBeInTheDocument();
  });

  it("o rótulo do topo (quem lê esta conversa) também só cita quem ficou", async () => {
    renderChat();
    expect(await screen.findByText("Colega lê esta conversa")).toBeInTheDocument();
  });
});

// PDF do Ernâni (tela 26): cabeçalho "Sua equipe" com os PAPÉIS, e o canal seguro em destaque.
describe("TeamChat / cabeçalho com papéis (PDF do Ernâni, tela 26)", () => {
  it("título 'Sua equipe' e papéis da equipe no subtítulo", async () => {
    renderChat();
    expect(await screen.findByText("Sua equipe")).toBeInTheDocument();
    expect(await screen.findByText("Fisioterapeuta")).toBeInTheDocument();
    expect(screen.queryByText("Nutricionista")).not.toBeInTheDocument(); // quem saiu não aparece
  });
  it("o canal seguro diz que é só você e a equipe", async () => {
    renderChat();
    expect(await screen.findByText(/Canal seguro · só você e sua equipe/)).toBeInTheDocument();
  });
});

describe("WP-09B2 — TeamChat continua roster-based, não Care Team", () => {
  it("T17/T19: monta o roster só com channel_professionals, nunca get_my_care_team", async () => {
    const { getMyCareTeam, listChannelProfessionals } = await import("@/lib/api");
    renderChat();
    await waitFor(() => expect(api.calls.length).toBeGreaterThanOrEqual(2));
    expect(listChannelProfessionals).toHaveBeenCalled();
    expect(getMyCareTeam).not.toHaveBeenCalled();
    expect(api.calls.every((c) => c.channelId === CHANNEL)).toBe(true);
  });

  it("T18: o seletor de menção continua no roster do canal", async () => {
    renderChat();
    await screen.findByText("Dra. Alvo Silva");
    const input = screen.getByPlaceholderText(/mensagem/i);
    fireEvent.change(input, { target: { value: "@" } });
    const seletor = await screen.findByText("Direcionar para a equipe:");
    const menu = seletor.closest("div")?.parentElement as HTMLElement;
    expect(within(menu).getByText("Dr. Colega Fica")).toBeInTheDocument();
    expect(within(menu).queryByText("Dra. Alvo Silva")).not.toBeInTheDocument();
  });
});
