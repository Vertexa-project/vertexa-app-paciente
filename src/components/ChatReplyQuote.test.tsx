import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ChatReplyQuote } from "./ChatReplyQuote";
import { QUOTE_UNAVAILABLE } from "@/lib/chatReply";
import type { ChatMessageView } from "@/lib/api/types";

const original: ChatMessageView = {
  id: "orig",
  channelId: "ch1",
  body: "Pode aumentar a carga do agachamento?",
  createdAt: "2026-07-29T12:00:00Z",
  senderProfileId: "p1",
  senderRole: "patient",
  isOwn: true,
  senderName: null,
  attachmentPath: null,
  attachmentName: null,
  attachmentMime: null,
  attachmentSize: null,
  replyToMessageId: null,
};

describe("ChatReplyQuote — só exibe, e nunca quebra a lista", () => {
  it("com a original resolvida: autor + trecho", () => {
    render(<ChatReplyQuote quoted={original} authorName="Você" pending={false} isOwn={false} />);
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByText("Pode aumentar a carga do agachamento?")).toBeInTheDocument();
  });

  it("enquanto busca: estado de carregamento, sem afirmar ausência", () => {
    render(<ChatReplyQuote quoted={null} authorName={null} pending isOwn={false} />);
    expect(screen.getByText("Buscando a mensagem original…")).toBeInTheDocument();
    expect(screen.queryByText(QUOTE_UNAVAILABLE)).not.toBeInTheDocument();
  });

  it("original não veio: degrada para indisponível em vez de sumir ou estourar", () => {
    render(<ChatReplyQuote quoted={null} authorName={null} pending={false} isOwn={false} />);
    expect(screen.getByText(QUOTE_UNAVAILABLE)).toBeInTheDocument();
  });

  it("original só-anexo: usa o nome do arquivo como trecho", () => {
    render(
      <ChatReplyQuote
        quoted={{ ...original, body: null, attachmentPath: "ch1/u.pdf", attachmentName: "exame.pdf" }}
        authorName="Você"
        pending={false}
        isOwn
      />,
    );
    expect(screen.getByText("exame.pdf")).toBeInTheDocument();
  });

  // O nome NÃO é decidido aqui: chega pronto de `messageAuthor`. Sem nome, o genérico — nunca
  // um espaço em branco onde deveria haver alguém.
  it("autor nulo com original resolvida: cai no genérico, não em vazio", () => {
    render(<ChatReplyQuote quoted={original} authorName={null} pending={false} isOwn={false} />);
    expect(screen.getByText("Profissional")).toBeInTheDocument();
  });
});
