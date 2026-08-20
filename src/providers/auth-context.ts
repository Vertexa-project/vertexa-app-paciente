import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthContextValue {
  /** Sessão real do Supabase (após login Google). */
  session: Session | null;
  loading: boolean;
  /** Autenticado = há sessão Supabase. NUNCA use isto como autorização de dados (RLS = outro WP). */
  isAuthenticated: boolean;
  /** Inicia o OAuth do Google (redireciona ao provedor). */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
