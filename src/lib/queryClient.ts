import { QueryClient } from "@tanstack/react-query";

/**
 * Single shared react-query client. Lives in its own module (not App.tsx) so non-React
 * modules — notably src/lib/eventSync.ts — can invalidate queries after a background write
 * (ex.: recuperação muscular recém-gravada -> o body map deve refazer o fetch).
 */
export const queryClient = new QueryClient();
