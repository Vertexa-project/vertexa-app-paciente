import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execFileSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";

/** SHA curto do git como fallback de release quando o CI não injeta VITE_APP_RELEASE. */
function gitShortSha(): string | undefined {
  try {
    // execFileSync (sem shell) com args fixos — sem interpolação, sem risco de injeção.
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Release do Sentry: prioriza o que o CI/Vercel injeta; senão, o SHA curto do git.
  // Não sobrescreve um VITE_APP_RELEASE explícito (via .env ou process.env).
  const env = loadEnv(mode, __dirname, "");
  if (!env.VITE_APP_RELEASE) {
    const fallback = process.env.VERCEL_GIT_COMMIT_SHA || gitShortSha();
    if (fallback) process.env.VITE_APP_RELEASE = fallback;
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    build: {
      // Source maps de produção → o Sentry consegue simbolicar os stack traces.
      // Nota: expõe o código-fonte publicamente se os .map forem servidos. Endurecer com
      // sourcemap:'hidden' + upload dos maps ao Sentry antes de publicar (ver docs/OBSERVABILITY.md).
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // React em chunk próprio: absorve a dependência COMPARTILHADA de react que o
            // @sentry/react também usa. Sem isso, o Rollup içaria o runtime do React para
            // dentro do chunk "sentry", criando uma aresta ESTÁTICA entry→sentry (o chunk
            // seria pré-carregado e baixado no boot mesmo sem DSN). Com o react isolado,
            // entry e sentry importam react daqui e o chunk sentry fica puro.
            react: ["react", "react-dom", "react-router-dom"],
            // Observabilidade (Sentry) em chunk próprio. Só é alcançado por import()
            // dinâmico (sentry-client) → chunk ASSÍNCRONO, NÃO pré-carregado, fora do
            // caminho crítico do boot. Sem VITE_SENTRY_DSN o import() nunca dispara → 0 bytes.
            sentry: ["@sentry/react"],
          },
        },
      },
    },
  };
});
