import { expect, test } from "@playwright/test";

test("pending não acessa o app autenticado em /home", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Acesso pendente" })).toBeVisible();
  await expect(page.getByText("Peso")).toHaveCount(0);
  await expect(page.getByText("Home")).toHaveCount(0);
});
