import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startEventSync } from "@/lib/eventSync";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ErrorBoundary } from "@/app/ErrorBoundary";

const root = createRoot(document.getElementById("root")!);

if (isSupabaseConfigured) {
  // Etapa 4c-1 — mirror relevant app events into Supabase activity_events.
  // Guarded by Supabase being configured (no env → no boot-time data calls).
  startEventSync();

  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  // Etapa 4a — dev-only Supabase smoke check (no production impact). Remove later.
  if (import.meta.env.DEV) {
    import("@/lib/devSmokeCheck").then(({ runSupabaseSmokeCheck }) => {
      runSupabaseSmokeCheck();
    });
  }
} else {
  // Env ausente: tela de configuração amigável (NUNCA tela branca). Espelha o fix da web.
  root.render(
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-display font-bold text-foreground">Configuração necessária</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        As variáveis de ambiente do Supabase não foram encontradas. Copie{" "}
        <code className="text-primary">.env.example</code> para{" "}
        <code className="text-primary">.env</code> e preencha{" "}
        <code className="text-primary">VITE_SUPABASE_URL</code> e{" "}
        <code className="text-primary">VITE_SUPABASE_ANON_KEY</code>.
      </p>
    </div>
  );
}
