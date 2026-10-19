import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

const GAMES_HEADING = { en: 'Game Catalog', ru: 'Каталог игр' };

/**
 * Picks Russian on the switch. A click that lands before React has hydrated the header does
 * nothing, so it clicks again until the header's own words turn Russian, which they do at once.
 */
async function switchToRussian(page: Page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'RU', exact: true }).first().click();
    await expect(page.getByRole('link', { name: 'Публичные дуэли' }).first()).toBeAttached({ timeout: 1000 });
  }).toPass();
}

test.describe('Language', () => {
  test('a page arrives from the server in the language its cookie names', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'duelme-lang', value: 'ru', url: baseURL ?? '' }]);
    const pageErrors = collectPageErrors(page);

    await page.goto('/games');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
    await expect(page.getByRole('contentinfo')).toContainText('Все права защищены');
    expect(pageErrors).toEqual([]);
  });

  test('the switch changes the page and keeps the choice across a reload', async ({ page }) => {
    await page.goto('/games');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.en);

    await switchToRussian(page);

    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
  });

  test('a link followed while the server saves the language opens at once, and the switch holds', async ({ page }) => {
    // Built ahead, so the dev server's first compile of the page does not count against the link.
    await page.request.get('/duels/public');
    await page.goto('/games');
    // The server takes its time over the new language: far longer than the link may take.
    await page.route('**/*', async (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
      await route.continue();
    });

    await switchToRussian(page);
    await page.getByRole('link', { name: 'Публичные дуэли' }).first().click();

    await expect(page).toHaveURL(/\/duels\/public$/, { timeout: 2000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru', { timeout: 10_000 });
    await expect(page.getByRole('contentinfo')).toContainText('Все права защищены');
  });

  test('another open tab follows the switch, so no tab mixes two languages', async ({ page, context }) => {
    const other = await context.newPage();
    await other.goto('/games');
    await page.goto('/games');

    await switchToRussian(page);

    await expect(other.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(other.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
  });
});
