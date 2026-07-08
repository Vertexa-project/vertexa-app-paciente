/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_DEMO_PATIENT_PROFILE_ID: string;
  // Observabilidade (Sentry). Todas OPCIONAIS — sem DSN a observabilidade fica desligada (no-op).
  // Ver src/lib/observability/sentry.ts e docs/OBSERVABILITY.md.
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
