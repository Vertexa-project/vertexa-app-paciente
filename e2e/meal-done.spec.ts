import { test, expect } from "../playwright-fixture";

// E2E do fluxo "marcar refeição como feita" (objetivo: persistir e ficar vivo).
// PRÉ-REQUISITOS para rodar de verdade:
//  1. migration 20260701120000_meal_logs.sql APLICADA no projeto Vertexa (cdhjfyyuhmwrcuxqavib);
//  2. deps instaladas (lovable-agent-playwright-config) para o runner/fixture carregarem;
//  3. .env com VITE_SUPABASE_* apontando pro projeto Vertexa (Mariana tem plano real: 3 refeições).
// O teste é SELF-CLEANING: marca e depois DESMARCA a mesma refeição -> não deixa dado no seed.

test.describe("Refeição feita persiste (meal_logs)", () => {
  test("marcar -> reload -> continua marcada; depois desmarca (cleanup)", async ({ page }) => {
    await page.goto("/plan");

    // Aba Alimentar (default). Botão de toggle da 1ª refeição real tem aria-label "Marcar ... como feita".
    const markFirst = page.getByRole("button", { name: /^Marcar .* como feita$/ }).first();
    await expect(markFirst).toBeVisible();

    // Marcar
    await markFirst.click();
    const unmarkFirst = page.getByRole("button", { name: /^Desmarcar / }).first();
    await expect(unmarkFirst).toBeVisible(); // virou "Desmarcar ..." (aria-pressed=true)

    // Reload -> continua marcada (persistiu em meal_logs)
    await page.reload();
    const stillMarked = page.getByRole("button", { name: /^Desmarcar / }).first();
    await expect(stillMarked).toBeVisible();

    // Home reflete "Refeições X/Y" reais (X>=1 após marcar)
    await page.goto("/home");
    await expect(page.getByText("Refeições")).toBeVisible();

    // Cleanup: volta e DESMARCA para não mutar o seed permanentemente
    await page.goto("/plan");
    await page.getByRole("button", { name: /^Desmarcar / }).first().click();
    await expect(page.getByRole("button", { name: /^Marcar .* como feita$/ }).first()).toBeVisible();
  });
});
