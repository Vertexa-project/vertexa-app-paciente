import { test, expect } from "../playwright-fixture";

// E2E do fluxo "registrar atividade complementar" (objetivo: persistir e ficar vivo).
// PRÉ-REQUISITOS para rodar de verdade:
//  1. migration activity_sessions APLICADA no projeto Vertexa (cdhjfyyuhmwrcuxqavib);
//  2. deps instaladas (lovable-agent-playwright-config) para o runner/fixture carregarem;
//  3. .env com VITE_SUPABASE_* apontando pro projeto Vertexa.
// ⚠️ NÃO é auto-limpante (activity_sessions é append-only, sem "desfazer" na UI): a limpeza do
//    dado de teste (linha + marcador + snapshot de VRI) é feita CIRURGICAMENTE via Supabase MCP
//    após a verificação (ver o roteiro da sessão). Aqui só provamos persistência ponta-a-ponta.

test.describe("Atividade complementar persiste (activity_sessions)", () => {
  test("registrar -> sucesso -> aparece em Progresso -> reload persiste", async ({ page }) => {
    await page.goto("/log-activity");

    // Step 1: escolher modalidade (Corrida) -> vai para os detalhes.
    await page.getByRole("button", { name: /Corrida/ }).click();

    // Step 2: salvar (duração default 30 min). Botão tem aria-label "Salvar atividade".
    const save = page.getByRole("button", { name: "Salvar atividade" });
    await expect(save).toBeVisible();
    await save.click();

    // Step 3: tela de sucesso só aparece se a escrita NÃO falhou.
    await expect(page.getByRole("heading", { name: "Atividade registrada!" })).toBeVisible();

    // Ir para o Progresso -> a atividade REAL aparece no bloco "Atividades complementares".
    await page.getByRole("button", { name: "Ver meu progresso" }).click();
    await expect(page).toHaveURL(/\/progress/);
    await expect(page.getByText("Corrida")).toBeVisible();
    await expect(page.getByText(/30 min/)).toBeVisible();
    // Estado vazio NÃO deve aparecer (há atividade real).
    await expect(page.getByText("Nenhuma atividade complementar ainda")).toHaveCount(0);

    // Reload -> continua lá (persistiu em activity_sessions).
    await page.reload();
    await expect(page.getByText("Corrida")).toBeVisible();
    await expect(page.getByText(/30 min/)).toBeVisible();
  });
});
