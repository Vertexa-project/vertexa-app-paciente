import { describe, expect, it } from "vitest";

import {
  REDACTED,
  redactDeep,
  redactFreeText,
  redactString,
  redactUrl,
  scrubBreadcrumb,
  scrubEvent,
} from "./scrub";

/**
 * PROVA DO CONTRATO DE PRIVACIDADE (LGPD / dado de saúde).
 *
 * Porta, para um teste REAL do repo, a "scrub-proof" que no web vivia só num scratchpad:
 * monta um evento sintético do Sentry recheado de PII FALSA (16 agulhas) em TODOS os
 * lugares por onde um evento real carregaria dado clínico, roda `scrubEvent` e prova que
 * NENHUMA agulha sobrevive na serialização — enquanto metadados úteis (browser/os/trace,
 * tags de roteamento, contadores) são preservados.
 *
 * Cada agulha é colocada só em caminhos que o contrato GARANTE sanear (chave sensível,
 * texto livre precedido de palavra-chave clínica, URL com query, user/headers removidos).
 * Nomes soltos em prosa sem palavra-chave clínica são um residual conhecido e documentado
 * (ver OBSERVABILITY.md) — não são exercitados como agulha aqui.
 */

// UUID de paciente, JWT e token de assinatura (todos falsos, formato realista).
const UUID = "550e8400-e29b-41d4-a716-446655440000";
const JWT =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const SIGNED_TOKEN = "sbSignAbc123Def456Ghi789Jkl012Mno345Pqr678Stu9";

/** As 16 agulhas de PII/saúde que NÃO podem sobreviver em nenhum lugar do evento. */
const NEEDLES: readonly string[] = [
  "Maria Silva", // 1. nome (chave sensível + frase clínica "paciente:")
  "maria.silva", // 2. username (event.user removido)
  "maria@example.com", // 3. e-mail (regex em string + chave sensível)
  "98888-7777", // 4. telefone BR (regex)
  "123.456.789-00", // 5. CPF (chave sensível "cpf")
  "hipertens", // 6. diagnóstico (chave "diagnostico" + frase "diagnóstico:")
  "bulking", // 7. plano alimentar (chave "plano" + frase "plano:")
  "hemograma", // 8. exame (frase "exame:")
  "insulina 10ui", // 9. prescrição/medicação (frase "prescricao:")
  JWT, // 10. JWT (regex + header Authorization removido)
  SIGNED_TOKEN, // 11. token de assinatura de storage (regex token longo)
  UUID, // 12. id de paciente (mascarado em rota; redigido em string)
  "Bearer ", // 13. cabeçalho Authorization (request.headers removido)
  "session=abc123", // 14. cookie de sessão (request.cookies removido)
  "host-interno-01", // 15. server_name (removido)
  "203.0.113.7", // 16. IP do usuário (event.user removido)
];

/** Valores NÃO-sensíveis que DEVEM sobreviver ao scrubbing (contexto útil de debug). */
const KEEP: readonly string[] = ["Chrome", "Windows", "react-query", "TypeError"];

/** Monta um evento sintético fresco a cada uso (scrubEvent muta o objeto). */
function makeEvent(): Record<string, unknown> {
  return {
    message: `Falha ao carregar paciente: Maria Silva, email maria@example.com, tel (11) 98888-7777, diagnóstico: hipertensão arterial`,
    server_name: "host-interno-01",
    user: {
      id: UUID,
      email: "maria@example.com",
      username: "maria.silva",
      ip_address: "203.0.113.7",
    },
    request: {
      url: `https://app.vertexa.com/pacientes/${UUID}/prontuario?token=${JWT}#secao`,
      method: "GET",
      headers: { Authorization: `Bearer ${JWT}`, "X-Real-Ip": "203.0.113.7" },
      cookies: { session: "session=abc123" },
      data: { diagnostico: "hipertensão arterial", nome: "Maria Silva" },
      query_string: `token=${JWT}`,
    },
    exception: {
      values: [
        {
          type: "TypeError",
          value:
            "insert falhou — plano: bulking 3000kcal; exame: hemograma; prescricao: insulina 10ui",
          stacktrace: {
            frames: [
              {
                filename: "app.js",
                function: "saveMeal",
                vars: { patientName: "Maria Silva", authToken: JWT, cpf: "123.456.789-00" },
              },
            ],
          },
        },
      ],
    },
    breadcrumbs: [
      {
        category: "fetch",
        message: `GET https://proj.supabase.co/storage/v1/object/sign/reports/${UUID}?token=${SIGNED_TOKEN}`,
        data: {
          url: `https://proj.supabase.co/storage/v1/object/sign/reports/${UUID}?token=${SIGNED_TOKEN}`,
          email: "maria@example.com",
        },
      },
    ],
    extra: {
      nome: "Maria Silva",
      cpf: "123.456.789-00",
      diagnostico: "hipertensão arterial",
      plano_alimentar: "bulking 3000kcal",
      safeCount: 42,
      nested: { patientEmail: "maria@example.com", note: "hemograma pendente" },
    },
    tags: {
      source: "react-query",
      userEmail: "maria@example.com",
    },
    contexts: {
      browser: { name: "Chrome", version: "120.0" },
      os: { name: "Windows", version: "11" },
      trace: { trace_id: "abcd1234", span_id: "ef567890" },
      patient: { name: "Maria Silva", diagnosis: "hipertensão arterial" },
    },
  };
}

describe("scrubEvent — prova do contrato (16 agulhas de PII)", () => {
  it("não deixa NENHUMA agulha de PII sobreviver na serialização do evento", () => {
    const scrubbed = scrubEvent(makeEvent());
    const serialized = JSON.stringify(scrubbed);
    for (const needle of NEEDLES) {
      expect(serialized, `agulha vazou: ${needle}`).not.toContain(needle);
    }
  });

  it("preserva metadados NÃO-sensíveis úteis para debug", () => {
    const scrubbed = scrubEvent(makeEvent());
    const serialized = JSON.stringify(scrubbed);
    for (const keep of KEEP) {
      expect(serialized, `metadado útil foi perdido: ${keep}`).toContain(keep);
    }
  });

  it("remove por completo a identidade do usuário e o server_name", () => {
    const scrubbed = scrubEvent(makeEvent());
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.server_name).toBeUndefined();
  });

  it("mantém só a rota mascarada do request; descarta headers/cookies/data/query", () => {
    const scrubbed = scrubEvent(makeEvent());
    const req = scrubbed.request as Record<string, unknown>;
    expect(req.url).toBe("https://app.vertexa.com/pacientes/:id/prontuario");
    expect(req.method).toBe("GET"); // metadado inócuo preservado
    expect(req.headers).toBeUndefined();
    expect(req.cookies).toBeUndefined();
    expect(req.data).toBeUndefined();
    expect(req.query_string).toBeUndefined();
  });

  it("descarta as variáveis locais dos frames de stack", () => {
    const scrubbed = scrubEvent(makeEvent());
    const values = (scrubbed.exception as { values: Array<Record<string, unknown>> }).values;
    const frame = (values[0].stacktrace as { frames: Array<Record<string, unknown>> }).frames[0];
    expect(frame.vars).toBeUndefined();
    expect(frame.filename).toBe("app.js"); // frame em si preservado (sem PII)
  });

  it("preserva contexts do SDK (browser/os/trace) e redige contexto custom (patient)", () => {
    const scrubbed = scrubEvent(makeEvent());
    const contexts = scrubbed.contexts as Record<string, Record<string, unknown>>;
    expect(contexts.browser.name).toBe("Chrome");
    expect(contexts.os.name).toBe("Windows");
    expect(contexts.trace.trace_id).toBe("abcd1234");
    expect(contexts.patient.name).toBe(REDACTED);
    expect(contexts.patient.diagnosis).toBe(REDACTED);
  });

  it("redige chaves sensíveis em extra/tags mas preserva contadores e tags de roteamento", () => {
    const scrubbed = scrubEvent(makeEvent());
    const extra = scrubbed.extra as Record<string, unknown>;
    const tags = scrubbed.tags as Record<string, unknown>;
    expect(extra.nome).toBe(REDACTED);
    expect(extra.cpf).toBe(REDACTED);
    expect(extra.diagnostico).toBe(REDACTED);
    expect(extra.plano_alimentar).toBe(REDACTED);
    expect(extra.safeCount).toBe(42);
    expect((extra.nested as Record<string, unknown>).patientEmail).toBe(REDACTED);
    expect(tags.source).toBe("react-query");
    expect(tags.userEmail).toBe(REDACTED);
  });

  it("é idempotente (rodar duas vezes não revela nada nem quebra)", () => {
    const once = scrubEvent(makeEvent());
    const twice = scrubEvent({ ...once });
    const serialized = JSON.stringify(twice);
    for (const needle of NEEDLES) {
      expect(serialized).not.toContain(needle);
    }
  });
});

describe("redactString — PII estruturada embutida em string", () => {
  it("redige e-mail, telefone, JWT, token longo e UUID", () => {
    expect(redactString("contato maria@example.com")).toBe(`contato ${REDACTED}`);
    expect(redactString("ligar (11) 98888-7777")).toContain(REDACTED);
    expect(redactString(`token ${JWT}`)).toBe(`token ${REDACTED}`);
    expect(redactString(`assinatura ${SIGNED_TOKEN}`)).toBe(`assinatura ${REDACTED}`);
    expect(redactString(`id ${UUID}`)).toBe(`id ${REDACTED}`);
  });

  it("preserva string sem PII e trata vazio", () => {
    expect(redactString("apenas um erro genérico")).toBe("apenas um erro genérico");
    expect(redactString("")).toBe("");
  });
});

describe("redactUrl — rota preservada, query/assinatura/UUID fora", () => {
  it("descarta query e hash e mascara UUID de paciente (URL absoluta)", () => {
    expect(redactUrl(`https://app.vertexa.com/pacientes/${UUID}/exames?token=${SIGNED_TOKEN}#x`)).toBe(
      "https://app.vertexa.com/pacientes/:id/exames",
    );
  });

  it("mascara UUID em caminho relativo e corta a query", () => {
    expect(redactUrl(`/pacientes/${UUID}?assinado=${SIGNED_TOKEN}`)).toBe("/pacientes/:id");
  });

  it("remove credenciais embutidas (user:pass@host)", () => {
    expect(redactUrl("https://user:secret@host.com/a")).toBe("https://host.com/a");
  });
});

describe("redactFreeText — frases clínicas em texto livre", () => {
  it("redige o valor após palavra-chave clínica", () => {
    const out = redactFreeText("diagnóstico: hipertensão arterial grave");
    expect(out).not.toContain("hipertens");
    expect(out).toContain(REDACTED);
  });

  it("também aplica o scrubbing de PII estruturada", () => {
    const out = redactFreeText("erro para maria@example.com");
    expect(out).not.toContain("maria@example.com");
  });
});

describe("redactDeep — travessia recursiva com guardas", () => {
  it("redige chave sensível por completo e passa chave de URL por redactUrl", () => {
    const out = redactDeep({
      nome: "Maria",
      url: `https://x.com/pacientes/${UUID}?t=${SIGNED_TOKEN}`,
      count: 7,
    }) as Record<string, unknown>;
    expect(out.nome).toBe(REDACTED);
    expect(out.url).toBe("https://x.com/pacientes/:id");
    expect(out.count).toBe(7);
  });

  it("não estoura em referência cíclica", () => {
    const cyclic: Record<string, unknown> = { safe: 1 };
    cyclic.self = cyclic;
    expect(() => redactDeep(cyclic)).not.toThrow();
  });
});

describe("scrubBreadcrumb — rastro de fetch/console/navegação", () => {
  it("redige message e data (URL assinada e e-mail)", () => {
    const crumb = scrubBreadcrumb({
      category: "fetch",
      message: `GET https://proj.supabase.co/sign/${UUID}?token=${SIGNED_TOKEN}`,
      data: { url: `https://proj.supabase.co/sign/${UUID}?token=${SIGNED_TOKEN}`, email: "maria@example.com" },
    });
    const serialized = JSON.stringify(crumb);
    expect(serialized).not.toContain(SIGNED_TOKEN);
    expect(serialized).not.toContain("maria@example.com");
    expect((crumb.data as Record<string, unknown>).url).toBe("https://proj.supabase.co/sign/:id");
  });
});
