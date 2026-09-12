import { expect, test } from "@playwright/test";

test("paciente pending vê PendingAccessScreen e não /home", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Acesso pendente" })).toBeVisible();
  await expect(page.getByText("Home")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
});
