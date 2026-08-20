Contrato cross-repo (fonte de verdade): ../vertexa-web-pro/docs/CONTRATO_INTEGRACAO.md — leia antes de mexer em dados compartilhados.

## Observabilidade (OBS-02)

Sentry (browser) DSN-gated — sem `VITE_SENTRY_DSN` é no-op absoluto (o app roda idêntico).
Não altera o contrato de dados: o app segue só consumindo o mesmo Supabase. Detalhes,
garantias de scrubbing (LGPD/saúde) e como validar um evento de teste em `docs/OBSERVABILITY.md`.

## Autenticação (AUTH-02 / WP-04B, app paciente)

O app usa **somente** autenticação Supabase/Google. Não há modo demonstração.
`VITE_AUTH_MODE` é legado: ausente / vazio / `"real"` sobe; `"demo"` ou qualquer outro valor
**falha no boot** (`assertAuthMode`). A variável na Vercel pode permanecer `real` (inócua).
**Nenhuma migration/RLS é criada aqui** — a autoridade do banco é o web.

**Contrato de identidade do paciente** (resolver PURO em `src/lib/auth/identity.ts`):

```
auth.uid() → profiles.auth_user_id → profiles.id → patients.profile_id → patient
```

Estados: `loading | anonymous | active | pending`. `active` só quando existe um `patients`
ligado ao profile do uid. Resolução em `src/hooks/useIdentity.ts` (`getPatientByAuthUserId`).
Sem sessão não há paciente. Não há pin de env.

**FAIL-CLOSED (`src/app/RequireAuth.tsx`):** sessão sem identidade resolvida
(`pending`/não resolvida) → `PendingAccessScreen` (tela neutra "peça à sua clínica para te
cadastrar"), **nunca** o app. Sem sessão → `/login`.

**Google-first (DÍVIDA-AUTH-3):** a tela de login expõe SOMENTE "Entrar com Google"
(sem e-mail/senha, sem Apple) — coerente com o gate do trigger (só o provider Google associa/
verifica o e-mail). O `signInWithOAuth` marca `signup_surface='patient_app'` (via `queryParams`).

**DÍVIDA-AUTH (surface):** o `supabase-js` 2.108.2 não tem `options.data` no OAuth, então
`signup_surface` vai por `queryParams` (melhor esforço). No trigger, `surface` é **diagnóstico
puro** (`auth_trigger_events`) e NUNCA concede privilégio (no-match sempre cria `patient` pending)
— a segurança independe de a superfície chegar como `patient_app` ou `other`.

Erros de auth vão ao Sentry com `source:"auth"` **sem PII** (só a razão do provedor; nunca
email/nome/uid). Ver `docs/OBSERVABILITY.md`.
