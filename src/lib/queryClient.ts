import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { captureException } from "@/lib/observability/sentry";

/**
 * Extrai um rótulo NÃO-sensível do query key (primeiro segmento, ex.: "workout",
 * "progress") para agrupar erros no Sentry. O restante do key pode conter id de
 * paciente (UUID) → NÃO é anexado ao evento.
 */
function queryScope(key: unknown): string | undefined {
  return Array.isArray(key) && typeof key[0] === "string" ? key[0] : undefined;
}

/**
 * Single shared react-query client. Lives in its own module (not App.tsx) so non-React
 * modules — notably src/lib/eventSync.ts — can invalidate queries after a background write
 * (ex.: recuperação muscular recém-gravada -> o body map deve refazer o fetch).
 *
 * Observabilidade: ponto único onde TODO erro de leitura/escrita via react-query (logo, todo
 * erro do Supabase que sobe pela camada `api/`) é reportado — sem tocar em `api/`/`hooks/`.
 * Report-only: NÃO re-lança, NÃO muda UI/retry/cache. Comportamento de produto inalterado
 * (nenhum `defaultOptions` novo). Sem DSN, `captureException` é no-op. O objeto de erro do
 * Supabase passa por scrubbing no `beforeSend` antes de sair.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      captureException(error, { source: "react-query", scope: queryScope(query.queryKey) });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      captureException(error, {
        source: "react-query",
        scope: queryScope(mutation.options.mutationKey) ?? "mutation",
      });
    },
  }),
});
