Contrato cross-repo (fonte de verdade): ../vertexa-web-pro/docs/CONTRATO_INTEGRACAO.md — leia antes de mexer em dados compartilhados.

## Observabilidade (OBS-02)

Sentry (browser) DSN-gated — sem `VITE_SENTRY_DSN` é no-op absoluto (o app roda idêntico).
Não altera o contrato de dados: o app segue só consumindo o mesmo Supabase. Detalhes,
garantias de scrubbing (LGPD/saúde) e como validar um evento de teste em `docs/OBSERVABILITY.md`.