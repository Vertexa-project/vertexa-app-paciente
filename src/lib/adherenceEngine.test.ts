import { describe, it, expect } from "vitest";
import * as adherenceEngine from "./adherenceEngine";
import { adherenceStateFromSnapshot, type PersistedAdherenceSnapshot } from "./adherenceEngine";

// ─────────────────────────────────────────────────────────────────────────────────────────
// WP-METRIC-1b — TESTES QUE TRAVAM A AUSÊNCIA.
//
// Este arquivo tinha 341 linhas exercitando `deriveAdherenceConfig`, `computeScore` e
// `getAdherenceState`: a fórmula do VRI reimplementada no cliente. Ela foi REMOVIDA, e com ela
// os testes que a descreviam. O que sobra aqui tem duas funções, e só duas:
//   1. impedir que o cálculo local VOLTE (o bloco abaixo falha se alguém reintroduzir a fórmula);
//   2. garantir que o que restou é MAPEAMENTO do snapshot do servidor, não cálculo disfarçado.
// ─────────────────────────────────────────────────────────────────────────────────────────

// Todo nome que existia quando o app calculava adesão sozinho. Se algum voltar a ser exportado,
// é sinal de que a fórmula voltou junto — e o painel e o app voltam a poder divergir.
const NOMES_DO_MOTOR_LOCAL = [
  "getAdherenceState",
  "deriveAdherenceConfig",
  "computeScore",
  "recencyPoints",
  "getLevel",
  "getStatus",
  "getRiskFactors",
  "getPositiveFactors",
  "getJourneyCheckpoints",
  "DEFAULT_CONFIG",
];

describe("WP-METRIC-1b: o app não calcula mais adesão", () => {
  it("adherenceEngine não exporta nenhuma peça do motor local de VRI", () => {
    const exportados = Object.keys(adherenceEngine);
    for (const nome of NOMES_DO_MOTOR_LOCAL) {
      expect(exportados, `'${nome}' voltou a ser exportado`).not.toContain(nome);
    }
  });

  it("o que sobrou é só leitura/apresentação do snapshot", () => {
    // Whitelist explícita: qualquer export NOVO neste módulo tem de ser justificado aqui, e a
    // revisão pergunta "isto calcula adesão?" antes de entrar.
    expect(Object.keys(adherenceEngine).sort()).toEqual(
      ["adherenceStateFromSnapshot", "getAutoActions", "getContextualMessage", "getJourneyPhase"].sort(),
    );
  });
});

describe("adherenceStateFromSnapshot: MAPEIA, não calcula", () => {
  // Snapshot deliberadamente "incoerente" com qualquer fórmula: score baixíssimo com streak alto
  // e semana cheia. Se sobrar cálculo local em algum lugar, ele corrigiria esses campos — e o
  // teste quebra. A verdade é do servidor, mesmo quando parece estranha.
  const incoerente: PersistedAdherenceSnapshot = {
    score: 12,
    level: "risco",
    status: "em_risco",
    streak: 40,
    weeklyCompletionRate: 100,
    riskFactors: ["fator do servidor"],
    positiveFactors: ["outro fator do servidor"],
  };

  it("preserva score, level, status, streak e semana exatamente como vieram", () => {
    const st = adherenceStateFromSnapshot(incoerente);
    expect(st.score).toBe(12);
    expect(st.level).toBe("risco");
    expect(st.status).toBe("em_risco");
    expect(st.streak).toBe(40);
    expect(st.weeklyCompletionRate).toBe(100);
  });

  it("preserva os fatores do servidor sem recalcular nem completar", () => {
    const st = adherenceStateFromSnapshot(incoerente);
    expect(st.riskFactors).toEqual(["fator do servidor"]);
    expect(st.positiveFactors).toEqual(["outro fator do servidor"]);
  });

  it("mapeia os campos persistidos e calcula a variação a partir do anterior", () => {
    const st = adherenceStateFromSnapshot(
      {
        score: 88,
        level: "alta",
        status: "em_acompanhamento",
        streak: 18,
        weeklyCompletionRate: 80,
        riskFactors: ["x"],
        positiveFactors: ["y"],
      },
      80,
    );
    expect(st.score).toBe(88);
    expect(st.level).toBe("alta");
    expect(st.streak).toBe(18);
    expect(st.weeklyCompletionRate).toBe(80);
    expect(st.lastScoreChange).toBe(8);
    expect(st.contextualMessage.length).toBeGreaterThan(0);
  });

  it("lastScoreChange = 0 sem snapshot anterior (não inventa variação)", () => {
    const st = adherenceStateFromSnapshot({
      score: 88,
      level: "alta",
      status: "em_acompanhamento",
      streak: 18,
      weeklyCompletionRate: 80,
      riskFactors: [],
      positiveFactors: [],
    });
    expect(st.lastScoreChange).toBe(0);
  });
});
