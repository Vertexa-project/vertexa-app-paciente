import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthContextValue {
  /** Sessão real do Supabase (só existe no modo real após login Google). */
  session: Session | null;
  loading: boolean;
  /**
   * Modo real: autenticado = há sessão real. Modo demo: sempre true (o app é acessível como
   * hoje; o gate real é inerte). NUNCA use isto como autorização de dados (RLS = outro WP).
   */
  isAuthenticated: boolean;
  /** Inicia o OAuth do Google (redireciona ao provedor). Só faz sentido em VITE_AUTH_MODE=real. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
