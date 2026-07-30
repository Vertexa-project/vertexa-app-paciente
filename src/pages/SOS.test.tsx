import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  channel: { id: "ch-1", patient_id: "pa-1", created_at: null } as unknown,
  channelThrows: false,
  sendThrows: false,
  sent: [] as { channelId: string; body?: string | null }[],
}));

vi.mock("@/lib/api", () => ({
  getMyChannel: vi.fn(async () => {
    if (api.channelThrows) throw new Error("boom");
    return api.channel;
  }),
  sendPatientMessage: vi.fn(async (input: { channelId: string; body?: string | null }) => {
    if (api.sendThrows) throw new Error("boom");
    api.sent.push(input);
    return { id: "msg-1", mentionFailed: false, mentionFailureReason: null };
  }),
}));

// O tracker é espionado, não mockado por conveniência: `help_requested` alimenta o cálculo de
// adesão (allow-list do eventSync), e este WP tem instrução EXPLÍCITA de não mexer nisso.
// O teste existe para travar exatamente esse ponto.
const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/eventTracker", () => ({ tracker: { track } }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const { default: SOS } = await import("./SOS");

function renderSOS() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SOS />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Seleciona "Dificuldade com dieta" e escreve o texto. */
async function preencher(texto: string) {
  fireEvent.click(await screen.findByText("Dificuldade com dieta"));
  fireEvent.change(screen.getByPlaceholderText(/descreva o que está acontecendo/i), {
    target: { value: texto },
  });
}

beforeEach(() => {
  api.channel = { id: "ch-1", patient_id: "pa-1", created_at: null };
  api.channelThrows = false;
  api.sendThrows = false;
  api.sent = [];
  track.mockClear();
  navigate.mockClear();
});

describe("SOS / o texto dela chega a um humano (WP-APP-7 item 2.1)", () => {
  it("envia MENSAGEM REAL no canal, com o texto preservado inteiro", async () => {
    renderSOS();
    const texto = "Não estou conseguindo seguir o plano nos fins de semana.";
    await preencher(texto);
    fireEvent.click(screen.getByRole("button", { name: /enviar para minha equipe/i }));

    await waitFor(() => expect(api.sent).toHaveLength(1));
    expect(api.sent[0].channelId).toBe("ch-1");
    expect(api.sent[0].body).toContain(texto);
    expect(api.sent[0].body).toContain("Dificuldade com dieta");
  });

  it("a confirmação só aparece DEPOIS do envio resolver, e fala da conversa", async () => {
    renderSOS();
    await preencher("preciso de ajuda com a dieta");

    // antes de clicar, nada de sucesso
    expect(screen.queryByText("Mensagem enviada")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /enviar para minha equipe/i }));
    expect(await screen.findByText("Mensagem enviada")).toBeInTheDocument();
    expect(screen.getByText(/está na sua conversa com a equipe/i)).toBeInTheDocument();
  });

  // A regra dura do WP: nenhuma frase pode afirmar notificação enquanto notificação não
  // existir no produto (0 linhas em `notifications`, nenhum emissor).
  it("NENHUMA frase afirma notificação, retorno ou análise", async () => {
    renderSOS();
    await preencher("teste");

    const proibido = /notificad|notificar|será notificada|avisamos|retornará|em breve|será analisada/i;
    expect(screen.queryByText(proibido)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /enviar para minha equipe/i }));
    await screen.findByText("Mensagem enviada");
    expect(screen.queryByText(proibido)).not.toBeInTheDocument();
  });

  it('o botão "Anexar foto" sem ação foi removido', async () => {
    renderSOS();
    await screen.findByText("Dificuldade com dieta");
    expect(screen.queryByText(/anexar foto/i)).not.toBeInTheDocument();
  });

  // `help_requested` alimenta activity_events -> recompute_adherence. Mexer nisso mudaria o
  // cálculo de adesão, que este WP proíbe. O evento tem de continuar saindo na tentativa,
  // com o mesmo payload.
  it("o evento help_requested continua sendo disparado, com o mesmo payload", async () => {
    renderSOS();
    await preencher("algum texto");
    fireEvent.click(screen.getByRole("button", { name: /enviar para minha equipe/i }));

    await waitFor(() => expect(api.sent).toHaveLength(1));
    expect(track).toHaveBeenCalledWith("help_requested", {
      category: "diet",
      hasMessage: true,
    });
  });
});

describe("SOS / nenhum juízo de adesão calculado no cliente (WP-METRIC-1b)", () => {
  // A tela tinha `const state = getAdherenceState()` e, sob `state.level !== 'alta'`, um aviso
  // "Percebemos uma queda na sua adesão". Como a chamada sem argumento caía no perfil de EXEMPLO
  // do módulo (que dá sempre 'alta'), o aviso NUNCA renderizou — era código morto que, ao receber
  // um config de verdade, passaria a julgar a adesão dela no cliente e a poder contradizer o
  // painel. Este teste trava a ausência do aviso E de qualquer número de adesão na tela.
  it("não afirma queda de adesão nem exibe índice/percentual", async () => {
    renderSOS();
    await screen.findByText("Dificuldade com dieta");

    expect(screen.queryByText(/queda na sua adesão/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/percebemos uma queda/i)).not.toBeInTheDocument();
    // Nenhum juízo de nível de adesão, em nenhuma das quatro faixas do VRI.
    expect(screen.queryByText(/adesão (alta|moderada|baixa|em risco)/i)).not.toBeInTheDocument();
    // E nenhum percentual solto na tela (o VRI é renderizado como "NN%" onde aparece).
    expect(screen.queryByText(/^\d{1,3}%$/)).not.toBeInTheDocument();
  });

  it("não importa nada do motor de adesão", async () => {
    // Guarda de DEPENDÊNCIA, e por isso lê a FONTE e não o runtime: um import reintroduzido
    // carregaria o módulo sem necessariamente renderizar nada, passando despercebido pelos
    // testes de tela acima. (Caminho a partir da raiz do projeto: sob jsdom o `import.meta.url`
    // não é uma URL `file:`.)
    const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    const fonte = await fs.readFile(path.join(process.cwd(), "src", "pages", "SOS.tsx"), "utf8");
    // Comentários fora: a tela DOCUMENTA o que foi removido (e cita o nome da função ao fazê-lo).
    // O guarda é sobre CÓDIGO — se olhasse a prosa, a própria explicação o faria falhar.
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(codigo).not.toMatch(/from ["']@\/lib\/adherenceEngine["']/);
    expect(codigo).not.toContain("getAdherenceState");
  });
});

describe("SOS / sem canal não inventa sucesso (WP-APP-7 item 2.1)", () => {
  it("diz que não é possível enviar e orienta, sem tela de sucesso", async () => {
    api.channel = null;
    renderSOS();

    expect(await screen.findByText("Não é possível enviar agora")).toBeInTheDocument();
    expect(screen.getByText(/fale com sua clínica para ativar o chat/i)).toBeInTheDocument();
    expect(screen.queryByText("Mensagem enviada")).not.toBeInTheDocument();
  });

  it("o botão de enviar fica indisponível, e clicar não envia nada", async () => {
    api.channel = null;
    renderSOS();
    await screen.findByText("Não é possível enviar agora");

    fireEvent.click(screen.getByText("Dificuldade com dieta"));
    const botao = screen.getByRole("button", { name: /enviar para minha equipe/i });
    expect(botao).toBeDisabled();

    fireEvent.click(botao);
    expect(api.sent).toHaveLength(0);
    expect(screen.queryByText("Mensagem enviada")).not.toBeInTheDocument();
  });
});

describe("SOS / falha no envio (WP-APP-7 item 2.1)", () => {
  // A tela de sucesso SUBSTITUI o formulário. Sucesso incondicional apagaria o texto dela.
  it("mostra a falha, NÃO mostra sucesso, e o texto dela continua no campo", async () => {
    api.sendThrows = true;
    renderSOS();
    const texto = "meu joelho dói desde ontem";
    await preencher(texto);
    fireEvent.click(screen.getByRole("button", { name: /enviar para minha equipe/i }));

    expect(await screen.findByText(/não foi possível enviar sua mensagem/i)).toBeInTheDocument();
    expect(screen.getByText(/ela não chegou à sua equipe/i)).toBeInTheDocument();
    expect(screen.queryByText("Mensagem enviada")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/descreva o que está acontecendo/i)).toHaveValue(texto);
  });

  it("falha ao verificar o canal: diz que falhou e oferece tentar de novo", async () => {
    api.channelThrows = true;
    renderSOS();

    expect(
      await screen.findByText(/não foi possível verificar sua conversa com a equipe/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    expect(screen.queryByText("Mensagem enviada")).not.toBeInTheDocument();
  });
});
