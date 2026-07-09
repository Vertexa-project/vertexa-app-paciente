import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

import { useAuth } from "@/providers/auth-context";

/**
 * Acesso pendente (modo real): a sessão Google é válida, mas o usuário ainda NÃO está vinculado
 * a um paciente cadastrado (1º login sem match por e-mail → o trigger criou um profile 'pending'
 * sem `patients`). Tela NEUTRA — não mostra dado de ninguém (nem o próprio e-mail). Onboarding de
 * paciente novo é escopo de outro WP; aqui só orientamos a pedir o cadastro + sair.
 */
export function PendingAccessScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <Clock className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-display font-bold text-foreground">Acesso pendente</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Seu login foi concluído, mas sua conta ainda não está vinculada a um cadastro de
          paciente. Peça à sua clínica para te cadastrar e liberar o acesso.
        </p>
      </div>
      <button
        onClick={handleSignOut}
        className="h-12 px-6 rounded-xl border border-border text-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
      >
        Sair
      </button>
    </div>
  );
}
