# Observabilidade (Sentry) — App Paciente

> Fundação de captura de erros do app paciente (browser). Instrumentada em **OBS-02**
> (branch `feat/obs-sentry-app`), espelhando a fundação do web (OBS-01). **Zero mudança de
> comportamento de produto**: o app roda IDÊNTICO com e sem observabilidade.

## O que é

`@sentry/react` capturando, quando há DSN configurado:

- **Erros de render** (via o `ErrorBoundary` global → `captureException`).
- **Rejections não tratadas** e `window.onerror` (integração default `globalHandlers` do SDK).
- **Erros de dados (Supabase/API)** — todo erro de query/mutation do react-query é reportado
  no `QueryCache`/`MutationCache` (`src/lib/queryClient.ts`), sem tocar em `api/`/`hooks/`.
- **Erros de autenticação (AUTH-02)** — falhas de OAuth/resolução de identidade com
  `source:"auth"` (ver `auth-provider.tsx`, `AuthCallback.tsx`, `useIdentity.ts`). **Sem PII**:
  só a razão do provedor; nunca email/nome/uid.

Metadados: `environment`, `release` (commit SHA) e `sendDefaultPii: false`.

## Arquitetura (3 arquivos)

| Arquivo | Papel |
|---|---|
| `src/lib/observability/scrub.ts` | **Puro, sem dependência de framework.** O scrubbing de PII/saúde. Núcleo testável (`scrub.test.ts`, 18 testes). |
| `src/lib/observability/sentry.ts` | **Facade leve** (import estático). `initObservability()` / `captureException()`. NÃO importa o SDK. |
| `src/lib/observability/sentry-client.ts` | **Camada pesada** — a única que importa `@sentry/react`. Carregada por `import()` dinâmico só quando há DSN. |

**Boot leve / init tardio:** sem DSN, o chunk do SDK (~30 KB gzip) **nem é baixado**. Com DSN,
ele carrega de forma assíncrona, fora do caminho crítico do boot. `initObservability()` roda
em `src/main.tsx` **antes do render** (cobre tanto o app quanto a tela de configuração).

## Variáveis de ambiente

Todas OPCIONAIS (ver `.env.example`). **Sem `VITE_SENTRY_DSN` → observabilidade desligada (no-op).**

| Var | Efeito |
|---|---|
| `VITE_SENTRY_DSN` | DSN público do browser. Vazio = desligado. É o único "segredo" que pode ir ao bundle (DSN de browser é público por design). **Nunca** colocar chave de servidor. |
| `VITE_APP_ENV` | `environment` no Sentry (ex.: `production`, `staging`). Default = `MODE` do Vite. |
| `VITE_APP_RELEASE` | `release` (idealmente o commit SHA). Em CI/Vercel: `VITE_APP_RELEASE=$VERCEL_GIT_COMMIT_SHA`. Se vazio, o build injeta o SHA curto do git (ver `vite.config.ts`). |

## Como validar um evento de teste

1. Preencha `VITE_SENTRY_DSN` no `.env` com o DSN do projeto Sentry.
2. `npm run build && npm run preview` (ou `npm run dev`).
3. No console do browser, dispare um erro não tratado:
   ```js
   Promise.reject(new Error("teste de observabilidade OBS-02"));
   ```
4. O evento deve aparecer no Sentry em ~segundos, com `environment`/`release` corretos.
   Confirme na aba **Network** que o POST ao endpoint de ingest do Sentry **não contém PII**.

## Garantias de scrubbing (LGPD / dado de saúde)

Provado por `src/lib/observability/scrub.test.ts` (vitest, **18 testes**): um evento sintético com
**16 agulhas de PII falsa** passa por `scrubEvent` e nenhuma sobrevive na serialização.
`beforeSend`/`beforeBreadcrumb` removem, de TODO evento:

- **Identidade:** `user` (id/email/ip/username) e `server_name` — removidos por completo.
- **URLs:** query string descartada (mata URL assinada de storage) + UUID de paciente na rota → `:id`.
- **Request:** `headers`/`cookies`/`data`/`query_string` removidos (Authorization/Cookie fora).
- **Strings:** e-mail, telefone, JWT, token longo e UUID redigidos onde aparecerem.
- **Texto livre** (`message`, `value` da exceção): além do acima, frases clínicas
  (`paciente …`, `diagnóstico: …`, `plano: …`, `exame …`, `prescrição …`) redigidas.
- **Chaves sensíveis** em `extra`/`tags`/contexts custom (nome, diagnóstico, plano, token…) → `[redacted]`.
- **Variáveis locais** dos frames de stack descartadas.
- `browser`/`os`/`trace` preservados (úteis, sem PII).

### Residual conhecido

Scrubbing por padrão **não detecta** um nome humano em prosa livre **sem** palavra-chave
clínica (ex.: `throw new Error("Falha para João")`). Mitigações:
1. **Convenção:** nunca interpolar dado de paciente em mensagens de erro lançadas (a camada
   `api/` não faz isso — erros vêm do Supabase/genéricos).
2. **Defesa em profundidade:** habilitar o *server-side data scrubbing* do Sentry.

## Decisões / dívidas

- **Report-only no react-query:** `queryClient` continua um `QueryClient` sem `defaultOptions`
  novos (retry/staleTime/refetch inalterados); só foram adicionados `queryCache`/`mutationCache`
  `onError`. Nenhuma mudança de comportamento de produto.
- **Tracing de performance DESLIGADO** (`tracesSampleRate: 0`, sem `browserTracingIntegration`):
  spans de fetch carregariam a URL assinada do Supabase. Reabrir exige também um
  `beforeSendTransaction` com scrubbing.
- **Source maps de produção** ligados (`vite.config.ts` `build.sourcemap: true`) para
  simbolicar stack traces. ⚠️ Servir os `.map` publicamente expõe o código-fonte. Endurecer
  antes de publicar: `sourcemap: 'hidden'` + upload dos maps ao Sentry (passo dedicado; NÃO
  incluído aqui — sem `@sentry/vite-plugin` nesta WP).
- **Dívida de lint pré-existente (shadcn/config):** o `lint` do app é `eslint .` (sem
  `--max-warnings 0`) e há 3 erros + 10 warnings pré-existentes em `components/ui/*` e
  `tailwind.config.ts`. **Não** foram tocados nesta WP; os arquivos novos de observabilidade
  passam limpos no lint estrito.

## Estado (OBS-02)

| Item | Status | Como |
|---|---|---|
| Fundação Sentry (scrub puro + facade/client lazy) | ✅ | `src/lib/observability/{scrub,sentry,sentry-client}.ts`; `@sentry/react@10.64.0` só via `import()` com DSN (chunk assíncrono; sem DSN não baixado). |
| ErrorBoundary + rejection + erro Supabase reportando | ✅ | `ErrorBoundary.componentDidCatch → captureException`; `globalHandlers` (default) cobre `onunhandledrejection`/`onerror`; `QueryCache`/`MutationCache` `onError` em `queryClient.ts` (report-only, sem tocar `api/`/`hooks/`). |
| Scrubbing agressivo (LGPD/saúde) provado | ✅ | `scrub.test.ts` (vitest, 18 testes; 16 agulhas de PII) → **PASS**. Residual (nome em prosa livre) documentado. |
| release+environment+SHA + source maps | ✅ | `.env.example` + `vite-env.d.ts` (`VITE_SENTRY_DSN`/`VITE_APP_ENV`/`VITE_APP_RELEASE`); `vite.config.ts` `sourcemap:true` + release por SHA do git (`execFileSync`, sem shell). |
| Gate endurecido (`build` roda `tsc`) | ✅ | `"build": "tsc -p tsconfig.app.json --noEmit && vite build"`. |
| Boot idêntico com/sem DSN | ✅ | Sem `VITE_SENTRY_DSN` → `initObservability()` é no-op; o chunk do SDK não é baixado. |

**Fora de escopo / a fazer depois:** endurecer source maps (`hidden` + upload ao Sentry via
`@sentry/vite-plugin`) antes de publicar; opcionalmente ligar server-side scrubbing no Sentry.
Nenhuma alteração de contrato/RLS/rotas/Auth/schema — o app segue consumindo o mesmo Supabase.
