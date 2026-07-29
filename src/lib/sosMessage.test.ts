import { describe, expect, it } from "vitest";

import { buildSosMessageBody, SOS_PREFIX } from "./sosMessage";

describe("buildSosMessageBody — o texto dela vai inteiro (WP-APP-7 item 2.1)", () => {
  it("cabeçalho com a categoria + o texto cru, separados", () => {
    const body = buildSosMessageBody({
      categoryLabel: "Dificuldade com dieta",
      message: "Não estou conseguindo seguir nos fins de semana.",
    });
    expect(body).toBe(
      `${SOS_PREFIX} — Dificuldade com dieta\n\nNão estou conseguindo seguir nos fins de semana.`,
    );
  });

  // O defeito corrigido por este WP foi reduzir o texto dela a um booleano. Nada de truncar.
  it("não trunca, não resume e não reescreve — nem texto longo", () => {
    const longo = "a".repeat(5000);
    const body = buildSosMessageBody({ categoryLabel: "Dor ou desconforto", message: longo });
    expect(body).toContain(longo);
    expect(body.endsWith(longo)).toBe(true);
  });

  it("preserva quebras de linha e acentuação do que ela escreveu", () => {
    const texto = "Dói no joelho\nprincipalmente à noite.";
    const body = buildSosMessageBody({ categoryLabel: "Dor ou desconforto", message: texto });
    expect(body).toContain(texto);
  });

  // sendPatientMessage recusa corpo vazio; o cabeçalho garante que nunca chegue vazio.
  it("sem texto livre, sobra o cabeçalho — e ele nunca e vazio", () => {
    expect(buildSosMessageBody({ categoryLabel: "Estou viajando", message: "" })).toBe(
      `${SOS_PREFIX} — Estou viajando`,
    );
    expect(buildSosMessageBody({ categoryLabel: "Estou viajando", message: "   \n  " })).toBe(
      `${SOS_PREFIX} — Estou viajando`,
    );
  });
});
