import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

const GAMES_HEADING = { en: 'Game Catalog', ru: 'Каталог игр' };

/**
 * The switch is a form, so it works whether or not the page's script has loaded yet. The wait allows
 * for a dev server compiling the route on its first post.
 */
async function switchToRussian(page: Page) {
  await page.getByRole('button', { name: 'RU', exact: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru', { timeout: 15_000 });
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

  test('the switch reloads the same page in the language and keeps the choice', async ({ page }) => {
    await page.goto('/games?q=chess');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.en);

    await switchToRussian(page);

    await expect(page).toHaveURL(/\/games\?q=chess$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
  });

  test('another open tab catches up when the reader comes back to it', async ({ page, context }) => {
    const other = await context.newPage();
    await other.goto('/games');
    await page.goto('/games');

    await switchToRussian(page);
    // Headless Chromium shows every tab at once, so the return to this one is played as the event it fires.
    await other.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    await expect(other.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(other.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
  });
});
