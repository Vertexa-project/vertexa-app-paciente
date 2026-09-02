import { useNavigate } from "react-router-dom";
import { Pause } from "lucide-react";

import { useAuth } from "@/providers/auth-context";

/**
 * Clínica suspensa — o app não carrega dado clínico.
 * Auth e identidade continuam válidos. Motivo administrativo não aparece.
 */
export function ClinicSuspendedScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="h-1.5 w-24 rounded-full bg-amber-500" aria-hidden />
      <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-700">
        <Pause className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-lg font-display font-bold text-foreground">
          Clínica temporariamente indisponível
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Os serviços da sua clínica estão temporariamente suspensos. Seus dados continuam
          preservados.
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
