import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

/** The game catalogue, as the backend would give it: the backend is not run here. */
async function serveGames(page: Page) {
  const game = (slug: string, name: string, category: string, duelCount: number) => ({
    slug,
    name,
    iconUrl: null,
    category,
    duelCount,
    createdAt: null,
    updatedAt: null,
  });
  await page.route(/\/api\/v1\/games(\?.*)?$/, (route) =>
    route.fulfill({ json: [game('cs2', 'CS2', 'FPS', 1), game('valorant', 'Valorant', 'FPS', 5)] })
  );
}

test.describe('Game catalog', () => {
  test('/games page loads with its title', async ({ page }) => {
    await page.goto('/games');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Games to play 1v1 for money|Игры 1\s*на\s*1 на деньги/);
  });

  test('/games page has category filters', async ({ page }) => {
    await page.goto('/games');
    await expect(page.getByRole('button', { name: /^(All|Все)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^(Shooter|Шутер)/ })).toBeVisible();
  });

  test('/games page has a search field that takes input', async ({ page }) => {
    await page.goto('/games');
    const search = page.getByRole('searchbox');
    await expect(search).toBeVisible();
    await search.fill('test');
    await expect(search).toHaveValue('test');
  });

  test('/games lists a category’s games played most first, each opening its own page', async ({ page }) => {
    await serveGames(page);
    await page.goto('/games');
    // Valorant comes after CS2 among the guides and by name: only its duels can put it first.
    const shooters = page.getByRole('list', { name: /^(Shooters|Шутеры)$/ });
    await expect(shooters.getByRole('link').first()).toHaveAttribute('href', '/games/valorant');
  });

  // With no backend for the page server, the page reads the game in the browser; the server's own
  // 404 for an unknown game is pinned in `src/app/__tests__/gamePage.test.ts`.
  test('/games/nonexistent says the catalog has no such game', async ({ page }) => {
    await page.route('**/api/v1/games/nonexistent-game-slug', (route) => route.fulfill({ status: 404 }));
    await page.goto('/games/nonexistent-game-slug');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/No such game|Такой игры/);
    await expect(page.getByRole('link', { name: /View all games|Все игры/ })).toHaveAttribute('href', '/games');
  });

  // The landing's top bar lists its own sections; every other page's lists the app's pages.
  test('Header has a Games link that opens the catalog', async ({ page }) => {
    await page.goto('/duels/public');
    const gamesLink = page.getByRole('link', { name: /^(Games|Игры)$/ }).first();
    await expect(gamesLink).toBeVisible();
    await gamesLink.click();
    await expect(page).toHaveURL(/\/games/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Games to play 1v1 for money|Игры 1\s*на\s*1 на деньги/);
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
    const fps = page.getByRole('button', { name: /^(Shooter|Шутер)/ });
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
