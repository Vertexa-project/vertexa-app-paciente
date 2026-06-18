import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startEventSync } from "@/lib/eventSync";

createRoot(document.getElementById("root")!).render(<App />);

// Etapa 4c-1 — mirror relevant app events into Supabase activity_events.
// Runs in production (real feature); guarded by Supabase being configured.
if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
  startEventSync();
}

// Etapa 4a — dev-only Supabase smoke check (no production impact). Remove later.
if (import.meta.env.DEV) {
  import("@/lib/devSmokeCheck").then(({ runSupabaseSmokeCheck }) => {
    runSupabaseSmokeCheck();
  });
}