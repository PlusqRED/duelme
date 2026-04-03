import { test, expect } from '@playwright/test';

test.describe('Public Duels', () => {

  test('/duels/open page loads with title', async ({ page }) => {
    await page.goto('/duels/open');
    await expect(page.locator('h1')).toContainText(/Open Duels|Открытые дуэли/);
  });

  test('/duels/open shows content or empty state', async ({ page }) => {
    await page.goto('/duels/open');
    const emptyOrCards = page.locator('text=/No open duels|Открытых дуэлей пока нет|USDT/');
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

  test('Header has Open Duels navigation link', async ({ page }) => {
    await page.goto('/');
    const navLink = page.locator('a[href="/duels/open"]');
    await expect(navLink.first()).toBeVisible();
    await expect(navLink.first()).toContainText(/Open Duels|Открытые дуэли/);
  });

});
