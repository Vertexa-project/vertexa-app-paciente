Contrato cross-repo (fonte de verdade): ../vertexa-web-pro/docs/CONTRATO_INTEGRACAO.md — leia antes de mexer em dados compartilhados.

## Observabilidade (OBS-02)

Sentry (browser) DSN-gated — sem `VITE_SENTRY_DSN` é no-op absoluto (o app roda idêntico).
Não altera o contrato de dados: o app segue só consumindo o mesmo Supabase. Detalhes,
garantias de scrubbing (LGPD/saúde) e como validar um evento de teste em `docs/OBSERVABILITY.md`.

## Autenticação (AUTH-02, app paciente)

Login real com Google atrás de `VITE_AUTH_MODE` (default `demo` → app IDÊNTICO a hoje; `real` →
login Google). **Nenhuma migration/RLS é criada aqui** — a autoridade do banco é o web (AUTH-01/
AUTH-02: trigger `handle_new_user` surface-aware fail-closed + `profiles.auth_user_id`). O app só
consome.

**Contrato de identidade do paciente** (resolver PURO em `src/lib/auth/identity.ts`):

```
auth.uid() → profiles.auth_user_id → profiles.id → patients.profile_id → patient
```

Estados: `loading | anonymous | demo | active | pending`. `active` só quando existe um `patients`
ligado ao profile do uid. Resolução real em `src/hooks/useIdentity.ts`
(`getPatientByAuthUserId`); o modo demo usa o pin `VITE_DEMO_PATIENT_PROFILE_ID` (ramo demo
IGNORADO em modo real).

**FAIL-CLOSED (`src/app/RequireAuth.tsx`):** em modo real, sessão sem identidade resolvida
(`pending`/não resolvida) → `PendingAccessScreen` (tela neutra "peça à sua clínica para te
cadastrar"), **nunca** o app. Sem sessão → `/login`. Em modo demo o guard é pass-through.

**Google-first (DÍVIDA-AUTH-3):** em `real`, a tela de login expõe SOMENTE "Entrar com Google"
(sem e-mail/senha, sem Apple) — coerente com o gate do trigger (só o provider Google associa/
verifica o e-mail). O `signInWithOAuth` marca `signup_surface='patient_app'` (via `queryParams`).

**DÍVIDA-AUTH (surface):** o `supabase-js` 2.108.2 não tem `options.data` no OAuth, então
`signup_surface` vai por `queryParams` (melhor esforço). No trigger, `surface` é **diagnóstico
puro** (`auth_trigger_events`) e NUNCA concede privilégio (no-match sempre cria `patient` pending)
— a segurança independe de a superfície chegar como `patient_app` ou `other`.

Erros de auth vão ao Sentry com `source:"auth"` **sem PII** (só a razão do provedor; nunca
email/nome/uid). Ver `docs/OBSERVABILITY.md`.