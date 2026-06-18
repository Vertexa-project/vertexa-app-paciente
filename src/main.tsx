import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Etapa 4a — dev-only Supabase smoke check (no production impact). Remove later.
if (import.meta.env.DEV) {
  import("@/lib/devSmokeCheck").then(({ runSupabaseSmokeCheck }) => {
    runSupabaseSmokeCheck();
  });
}
