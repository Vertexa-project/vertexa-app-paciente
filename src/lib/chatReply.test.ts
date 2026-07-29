import { describe, expect, it } from "vitest";

import { QUOTE_UNAVAILABLE, indexById, missingQuotedIds, quotedPreview } from "./chatReply";
import type { ChatMessageView } from "@/lib/api/types";

const msg = (over: Partial<ChatMessageView> & { id: string }): ChatMessageView => ({
  channelId: "ch1",
  body: null,
  createdAt: "2026-07-29T12:00:00Z",
  senderProfileId: "p1",
  senderRole: "professional",
  isOwn: false,
  displayName: "Dra. Ana",
  specialty: null,
  type: null,
  attachmentPath: null,
  attachmentName: null,
  attachmentMime: null,
  attachmentSize: null,
  replyToMessageId: null,
  ...over,
});

describe("quotedPreview", () => {
  it("usa o texto da original", () => {
    expect(quotedPreview(msg({ id: "a", body: "Bom dia!" }))).toBe("Bom dia!");
  });

  it("trunca texto longo com reticências", () => {
    const preview = quotedPreview(msg({ id: "a", body: "x".repeat(200) }), 10);
    expect(preview).toBe(`${"x".repeat(10)}…`);
  });

  it("mensagem só-anexo (body null) usa o nome do arquivo", () => {
    expect(quotedPreview(msg({ id: "a", attachmentPath: "ch1/u.pdf", attachmentName: "exame.pdf" })))
      .toBe("exame.pdf");
  });

  it("anexo sem nome vira rótulo genérico", () => {
    expect(quotedPreview(msg({ id: "a", attachmentPath: "ch1/u.pdf" }))).toBe("Anexo");
  });

  it("sem texto e sem anexo, não devolve string vazia", () => {
    expect(quotedPreview(msg({ id: "a" }))).toBe("Mensagem sem texto");
  });
});

describe("missingQuotedIds — só busca o que não está carregado", () => {
  it("citação já presente na lista não gera busca", () => {
    const list = [msg({ id: "a" }), msg({ id: "b", replyToMessageId: "a" })];
    expect(missingQuotedIds(list)).toEqual([]);
  });

  it("citação ausente entra na busca, sem duplicar", () => {
    const list = [
      msg({ id: "b", replyToMessageId: "zzz" }),
      msg({ id: "c", replyToMessageId: "zzz" }),
      msg({ id: "d", replyToMessageId: "yyy" }),
    ];
    expect(missingQuotedIds(list)).toEqual(["zzz", "yyy"]);
  });

  it("lista sem respostas não pede nada", () => {
    expect(missingQuotedIds([msg({ id: "a" })])).toEqual([]);
    expect(missingQuotedIds([])).toEqual([]);
  });
});

describe("indexById — carregadas + buscadas", () => {
  it("resolve pelas carregadas e pelas buscadas depois", () => {
    const loaded = [msg({ id: "a", body: "original" })];
    const fetched = [msg({ id: "zzz", body: "veio depois" })];
    const index = indexById(loaded, fetched);
    expect(index.get("a")?.body).toBe("original");
    expect(index.get("zzz")?.body).toBe("veio depois");
  });

  // A degradação do item 4: o que não veio simplesmente não está no índice, e a bolha
  // renderiza QUOTE_UNAVAILABLE em vez de quebrar a lista.
  it("id que não veio fica ausente do índice", () => {
    const index = indexById([msg({ id: "a" })], []);
    expect(index.get("sumiu")).toBeUndefined();
    expect(QUOTE_UNAVAILABLE).toBe("Mensagem original indisponível");
  });
});
