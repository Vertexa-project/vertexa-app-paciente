import { describe, expect, it } from "vitest";

import { classifyMentionFailure, mentionFailureMessage } from "./chatMention";

describe("classifyMentionFailure", () => {
  it("42501 (RLS recusou) => o marcado não está mais no canal", () => {
    expect(classifyMentionFailure({ code: "42501" })).toBe("not_participant");
  });

  it("qualquer outro erro => unknown (não afirmamos o motivo)", () => {
    expect(classifyMentionFailure({ code: "23503" })).toBe("unknown");
    expect(classifyMentionFailure({ code: null })).toBe("unknown");
    expect(classifyMentionFailure({})).toBe("unknown");
    expect(classifyMentionFailure(null)).toBe("unknown");
    expect(classifyMentionFailure(undefined)).toBe("unknown");
  });
});

describe("mentionFailureMessage — a mensagem FOI enviada", () => {
  const both = [
    mentionFailureMessage("Dra. Ana", "not_participant"),
    mentionFailureMessage("Dra. Ana", "unknown"),
  ];

  it("todo texto começa afirmando que a mensagem foi enviada", () => {
    for (const text of both) expect(text.startsWith("Mensagem enviada.")).toBe(true);
  });

  it("nenhum texto diz que o envio falhou nem manda tentar de novo", () => {
    for (const text of both) {
      expect(text).not.toMatch(/falh|erro|não foi enviada|tente novamente|reenvi/i);
    }
  });

  it("42501 diz o motivo real: a pessoa saiu da conversa", () => {
    expect(mentionFailureMessage("Dra. Ana", "not_participant")).toBe(
      "Mensagem enviada. Não foi possível marcar Dra. Ana: essa pessoa não está mais nesta conversa.",
    );
  });

  it("erro desconhecido NÃO inventa o motivo", () => {
    const text = mentionFailureMessage("Dra. Ana", "unknown");
    expect(text).toContain("Dra. Ana");
    expect(text).not.toContain("não está mais nesta conversa");
  });

  it("sem nome utilizável, ainda produz frase válida", () => {
    expect(mentionFailureMessage("   ", "not_participant")).toContain("o profissional");
  });
});
