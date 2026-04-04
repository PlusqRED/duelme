import { test, expect } from '@playwright/test';

test.describe('Public Duels', () => {

  test('/duels/public page loads with title', async ({ page }) => {
    await page.goto('/duels/public');
    await expect(page.locator('h1')).toContainText(/Public Duels|Публичные дуэли/);
  });

  test('/duels/public shows content or empty state', async ({ page }) => {
    await page.goto('/duels/public');
    const emptyOrCards = page.locator('text=/No public duels|Публичных дуэлей пока нет|USDT/');
    await expect(emptyOrCards.first()).toBeVisible({ timeout: 15000 });
  });

  test('/duel/create has Private/Public toggle', async ({ page }) => {
    await page.goto('/duel/create');
    const privateBtn = page.locator('button', { hasText: /Private|Приватная/ });
    const publicBtn = page.locator('button', { hasText: /Public|Публичная/ });
    await expect(privateBtn).toBeVisible();
    await expect(publicBtn).toBeVisible();
  });

  test('/duel/create Private is selected by default', async ({ page }) => {
    await page.goto('/duel/create');
    const privateBtn = page.locator('button', { hasText: /Private|Приватная/ });
    await expect(privateBtn).toHaveClass(/border-indigo-500/);
  });

  test('/duel/create Public toggle changes hint text', async ({ page }) => {
    await page.goto('/duel/create');
    const publicBtn = page.locator('button', { hasText: /Public|Публичная/ });
    await publicBtn.click();
    const hint = page.locator('text=/Anyone can find|Любой может найти/');
    await expect(hint.first()).toBeVisible();
  });

  test('Header has Public Duels navigation link', async ({ page }) => {
    await page.goto('/');
    const navLink = page.locator('a[href="/duels/public"]');
    await expect(navLink.first()).toBeVisible();
    await expect(navLink.first()).toContainText(/Public Duels|Публичные дуэли/);
  });

});
