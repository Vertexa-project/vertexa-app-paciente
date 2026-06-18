// Single Supabase client for the patient app (anon key only).
// All data access goes through src/lib/api/* — screens never import this directly.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
  );
}

// Anon key only — never the service_role key in a front-end app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
