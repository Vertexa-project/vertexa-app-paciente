// Single Supabase client for the patient app (anon key only).
// All data access goes through src/lib/api/* — screens never import this directly.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * true quando as variáveis de ambiente do Supabase existem. O boot (main.tsx) usa esta flag
 * para exibir uma tela de configuração amigável em vez de estourar um throw no carregamento
 * do módulo — que deixava o app em tela branca (o React nem montava). Espelha o fix da web
 * (Sessão 1): `.env` é gitignored, só `.env.example` é versionado, então um clone sem `.env`
 * batia nesse crash.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Não logar valores; apenas sinalizar a ausência para depuração local.
  console.error(
    "[VERTEXA] VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes. " +
      "Copie .env.example para .env e preencha os valores do Supabase."
  );
}

// Anon key only — nunca a service_role key em um app de front-end.
// Fallback inócuo quando ausentes: evita que createClient() lance no carregamento do módulo.
// Sob ausência de config, o boot NÃO monta o app nem dispara chamadas (ver main.tsx);
// a tela de configuração é exibida antes de qualquer uso real deste client.
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "anon-key-missing"
);
