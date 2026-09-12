import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

import { loadE2EFixtures } from "./loadFixtures";

test.describe.configure({ mode: "serial" });

test("linked patient storageState via UI email/password", async ({ page }) => {
  const fixtures = loadE2EFixtures();
  mkdirSync("playwright/.auth", { recursive: true });
  await page.goto("/login");
  await page.locator("#login-email").fill(fixtures.emails.patient);
  await page.locator("#login-password").fill(fixtures.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Home")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Acesso pendente")).toHaveCount(0);
  await page.context().storageState({ path: "playwright/.auth/patient.json" });
});

test("pending patient storageState via UI email/password", async ({ page }) => {
  const fixtures = loadE2EFixtures();
  mkdirSync("playwright/.auth", { recursive: true });
  await page.goto("/login");
  await page.locator("#login-email").fill(fixtures.emails.pending);
  await page.locator("#login-password").fill(fixtures.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Acesso pendente" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Home")).toHaveCount(0);
  await page.context().storageState({ path: "playwright/.auth/patient-pending.json" });
});
