import { expect, test } from "@playwright/test";

test("paciente vinculado chega em /home autenticado", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByText("Home")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acesso pendente" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/home/);
});
