import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

test.describe('Game catalog', () => {
  test('/games page loads with its title', async ({ page }) => {
    await page.goto('/games');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Game Catalog|Каталог игр/);
  });

  test('/games page has category filters', async ({ page }) => {
    await page.goto('/games');
    await expect(page.getByRole('button', { name: /^(All|Все)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /FPS|Шутер/ })).toBeVisible();
  });

  test('/games page has a search field that takes input', async ({ page }) => {
    await page.goto('/games');
    const search = page.getByRole('textbox');
    await expect(search).toBeVisible();
    await search.fill('test');
    await expect(search).toHaveValue('test');
  });

  test('/games/nonexistent shows not found', async ({ page }) => {
    await page.goto('/games/nonexistent-game-slug');
    await expect(page.locator('body')).toContainText(/not found|не найдена/i);
  });

  // The landing's top bar lists its own sections; every other page's lists the app's pages.
  test('Header has a Games link that opens the catalog', async ({ page }) => {
    await page.goto('/duels/public');
    const gamesLink = page.getByRole('link', { name: /^(Games|Игры)$/ }).first();
    await expect(gamesLink).toBeVisible();
    await gamesLink.click();
    await expect(page).toHaveURL(/\/games/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Game Catalog|Каталог игр/);
  });

  test('/duel/create has a game search that takes input', async ({ page }) => {
    await page.goto('/duel/create');
    const gameInput = page.getByRole('searchbox', { name: /Search games|Найти игру/ });
    await expect(gameInput).toBeVisible();
    await gameInput.fill('Valorant');
    await expect(gameInput).toHaveValue('Valorant');
  });

  for (const path of ['/', '/dashboard', '/profile']) {
    test(`${path} loads without page errors`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(path);
      await page.waitForTimeout(2000);
      expect(errors).toEqual([]);
    });
  }

  test('A category filter toggles on click', async ({ page }) => {
    await page.goto('/games');
    const fps = page.getByRole('button', { name: /FPS|Шутер/ });
    await fps.click();
    await expect(fps).toHaveAttribute('aria-pressed', 'true');
    await fps.click();
    await expect(fps).toHaveAttribute('aria-pressed', 'false');
  });

  test('The phone menu has a Games link', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/duels/public');
    const menu = page.getByRole('button', { name: /^(Menu|Меню)$/ });
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: /^(Games|Игры)$/ }).filter({ visible: true })).toBeVisible();
  });
});
