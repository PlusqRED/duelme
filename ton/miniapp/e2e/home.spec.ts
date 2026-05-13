import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("renders DuelMe hero and bottom nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("DuelMe").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /create/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /duels/i }).first()).toBeVisible();
  });

  test("clicking create routes to /create", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /create/i }).first().click();
    await expect(page).toHaveURL(/\/create$/);
  });
});

test.describe("404 / not-found", () => {
  test("handles unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
  });
});
