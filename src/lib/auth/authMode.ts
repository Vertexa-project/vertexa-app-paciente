// Modo de autenticação do app paciente. Default = "demo" para NÃO mudar nada hoje.
//
// - demo: identidade vem do pin de env (VITE_DEMO_PATIENT_PROFILE_ID). App IDÊNTICO ao de
//   hoje (mesma splash/entrada mock, mesmos dados de demo da Mariana).
// - real: identidade vem da sessão Supabase (auth.uid() → profiles.auth_user_id → profiles.id
//   → patients.profile_id → patient). Login Google real; sessão sem patient → PendingAccess
//   (FAIL-CLOSED). Só "Entrar com Google" (DÍVIDA-AUTH-3: produto é Google-first).
//
// ⚠️ RLS ainda é permissiva (sprint) nos dois modos — fechar por papel/paciente é outro WP.
export type AuthMode = "demo" | "real";

export const AUTH_MODE: AuthMode =
  import.meta.env.VITE_AUTH_MODE === "real" ? "real" : "demo";

export const isRealAuth = AUTH_MODE === "real";
export const isDemoAuth = AUTH_MODE === "demo";
