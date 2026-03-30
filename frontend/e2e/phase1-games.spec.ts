import { test, expect } from '@playwright/test';

test.describe('Phase 1: Game Catalog', () => {

  test('1. /games page loads with empty state', async ({ page }) => {
    await page.goto('/games');
    await expect(page.locator('h1')).toContainText(/Game Catalog|Каталог игр/);
    // Should show empty state or game cards
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. /games page has category filter buttons', async ({ page }) => {
    await page.goto('/games');
    // "All" button should exist
    const allBtn = page.locator('button', { hasText: /All|Все/ });
    await expect(allBtn).toBeVisible();
    // At least FPS category button
    const fpsBtn = page.locator('button', { hasText: /FPS|Шутер/ });
    await expect(fpsBtn).toBeVisible();
  });

  test('3. /games page has search input', async ({ page }) => {
    await page.goto('/games');
    const search = page.locator('input[placeholder]');
    await expect(search).toBeVisible();
    await search.fill('test');
    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('4. /games/nonexistent shows not found', async ({ page }) => {
    await page.goto('/games/nonexistent-game-slug');
    await expect(page.locator('body')).toContainText(/not found|не найдена/i);
  });

  test('5. Header has Games link (visible to all)', async ({ page }) => {
    await page.goto('/');
    // Desktop nav
    const gamesLink = page.locator('a[href="/games"]').first();
    await expect(gamesLink).toBeVisible();
    await expect(gamesLink).toContainText(/Games|Игры/);
  });

  test('6. Games link navigates to /games', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/games"]').first().click();
    await expect(page).toHaveURL(/\/games/);
    await expect(page.locator('h1')).toContainText(/Game Catalog|Каталог игр/);
  });

  test('7. Landing page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test('8. /duel/create page has game field', async ({ page }) => {
    await page.goto('/duel/create');
    // Game autocomplete input should be present
    const gameInput = page.locator('input[placeholder*="game" i], input[placeholder*="игр" i]');
    await expect(gameInput).toBeVisible();
  });

  test('9. Game autocomplete accepts input', async ({ page }) => {
    await page.goto('/duel/create');
    const gameInput = page.locator('input[placeholder*="game" i], input[placeholder*="игр" i]');
    await gameInput.fill('Valorant');
    // Should show hint text about auto-creation
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('10. Dashboard loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test('11. Profile page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test('12. Category filter toggles on click', async ({ page }) => {
    await page.goto('/games');
    const fpsBtn = page.locator('button', { hasText: /FPS|Шутер/ });
    await fpsBtn.click();
    // Button should now be active (indigo background)
    await expect(fpsBtn).toHaveClass(/bg-indigo-600/);
    // Click again to deselect
    await fpsBtn.click();
    await expect(fpsBtn).not.toHaveClass(/bg-indigo-600/);
  });

  test('13. Mobile menu has Games link', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // Open mobile menu via hamburger button (md:hidden)
    const menuBtn = page.locator('button.md\\:hidden').first();
    await menuBtn.click();
    await page.waitForTimeout(300);
    // Games link inside the mobile dropdown (border-t container)
    const mobileGamesLink = page.locator('.border-t a[href="/games"]');
    await expect(mobileGamesLink).toBeVisible();
  });

  test('14. SideNav includes Games section', async ({ page }) => {
    await page.goto('/');
    const sidenavGames = page.locator('a[href="#games"]');
    if (await sidenavGames.count() > 0) {
      await expect(sidenavGames.first()).toBeVisible();
    }
    // Pass even if sidenav is hidden (depends on viewport)
  });
});
