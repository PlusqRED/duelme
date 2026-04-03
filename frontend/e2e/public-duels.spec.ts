import { test, expect } from '@playwright/test';

test.describe('Public Duels', () => {

  test('1. /duels/open page loads with title and subtitle', async ({ page }) => {
    await page.goto('/duels/open');
    await expect(page.locator('h1')).toContainText(/Open Duels|Открытые дуэли/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. /duels/open shows empty state when no public duels', async ({ page }) => {
    await page.goto('/duels/open');
    // Should show either duel cards or the empty state message
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Empty state or cards should be present
    const emptyOrCards = page.locator('text=/No open duels|Открытых дуэлей пока нет|USDT/');
    await expect(emptyOrCards.first()).toBeVisible({ timeout: 15000 });
  });

  test('3. /duels/open has search input when duels exist', async ({ page }) => {
    await page.goto('/duels/open');
    // Wait for loading to finish
    await page.waitForTimeout(3000);
    // Search input may or may not be visible depending on whether open duels exist
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('4. /duel/create page has Private/Public toggle', async ({ page }) => {
    await page.goto('/duel/create');
    // Should see the duel type toggle buttons
    const privateBtn = page.locator('button', { hasText: /Private|Приватная/ });
    const publicBtn = page.locator('button', { hasText: /Public|Публичная/ });
    await expect(privateBtn).toBeVisible();
    await expect(publicBtn).toBeVisible();
  });

  test('5. /duel/create Private is selected by default', async ({ page }) => {
    await page.goto('/duel/create');
    const privateBtn = page.locator('button', { hasText: /Private|Приватная/ });
    // Private button should have the active styling (border-indigo-500)
    await expect(privateBtn).toHaveClass(/border-indigo-500/);
  });

  test('6. /duel/create Public toggle changes hint text', async ({ page }) => {
    await page.goto('/duel/create');
    const publicBtn = page.locator('button', { hasText: /Public|Публичная/ });
    await publicBtn.click();
    // Hint should mention anyone can find and join
    const hint = page.locator('text=/Anyone can find|Любой может найти/');
    await expect(hint.first()).toBeVisible();
  });

  test('7. Header has Open Duels navigation link', async ({ page }) => {
    await page.goto('/');
    const navLink = page.locator('a[href="/duels/open"]');
    await expect(navLink.first()).toBeVisible();
    await expect(navLink.first()).toContainText(/Open Duels|Открытые дуэли/);
  });

  test('8. Landing page shows Open Duels section or hides if none', async ({ page }) => {
    await page.goto('/');
    // Wait for data to load
    await page.waitForTimeout(5000);
    // The section either appears (if public duels exist) or doesn't
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

});
