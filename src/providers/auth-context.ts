import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

import type { PasswordResetRequestResult } from "@/lib/api/authPassword";

export interface AuthContextValue {
  /** Sessão real do Supabase (e-mail/senha, Google ou recovery). */
  session: Session | null;
  loading: boolean;
  /** Autenticado = há sessão Supabase. NUNCA use isto como autorização de dados (RLS = outro WP). */
  isAuthenticated: boolean;
  /** Sessão originada de PASSWORD_RECOVERY — não é acesso clínico. */
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Inicia o OAuth do Google (redireciona ao provedor). */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<PasswordResetRequestResult>;
  updatePassword: (password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
