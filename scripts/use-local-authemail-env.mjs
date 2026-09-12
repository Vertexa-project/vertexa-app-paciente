/**
 * AUTH-EMAIL-03 — gera .env.authemail03.local a partir do stack isolado.
 * Não toca .env, .env.local nem .env.development.local.
 * Não imprime a anon key.
 */
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, ".env.authemail03.local");
const candidates = [
  process.env.VERTEXA_AUTHEMAIL_STACK,
  path.join(root, ".tmp-authemail01"),
  path.resolve(root, "..", "vertexa-web-pro", ".tmp-authemail01"),
].filter(Boolean);

const isolated = candidates.find((dir) => existsSync(dir));

if (!isolated) {
  console.error("[AUTH-EMAIL-03] Stack isolado ausente (vertexa-authemail01). Não aponte para produção.");
  process.exit(1);
}

const result = spawnSync("npx", ["supabase", "status", "-o", "env"], {
  cwd: isolated,
  encoding: "utf8",
  shell: true,
});

if (result.status !== 0) {
  console.error("[AUTH-EMAIL-03] supabase status falhou. Suba o stack isolado antes.");
  process.exit(result.status ?? 1);
}

const envText = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const apiUrl = envText.match(/^API_URL=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
const anonKey = envText.match(/^ANON_KEY=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "");

if (!apiUrl || !anonKey) {
  console.error("[AUTH-EMAIL-03] Não foi possível ler API_URL/ANON_KEY do stack local.");
  process.exit(1);
}

if (/supabase\.co/i.test(apiUrl)) {
  console.error("[AUTH-EMAIL-03] Recusou URL remota. Este script só aceita stack local.");
  process.exit(1);
}

writeFileSync(
  outFile,
  [
    "# Gerado por scripts/use-local-authemail-env.mjs — gitignored.",
    "# NÃO é produção. Não commitar.",
    `VITE_SUPABASE_URL=${apiUrl}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
    "",
  ].join("\n"),
  { encoding: "utf8" },
);

console.info("[AUTH-EMAIL-03] Escreveu .env.authemail03.local apontando ao stack isolado.");
console.info("[AUTH-EMAIL-03] Suba o app com: npm run dev:local-auth");
