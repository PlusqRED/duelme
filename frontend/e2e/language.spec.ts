import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

const GAMES_HEADING = { en: 'Game catalog', ru: 'Каталог игр' };

/**
 * A press does nothing until the page's script has loaded, so the press is repeated until the page
 * is in the language; the wait allows for a dev server compiling the route on its first visit.
 */
async function switchTo(page: Page, name: 'EN' | 'RU', lang: 'en' | 'ru') {
  const button = page.getByRole('button', { name, exact: true }).first();
  await expect(async () => {
    await button.click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang, { timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}

test.describe('Language', () => {
  test('a Russian address arrives from the server in Russian', async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto('/ru/games');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
    await expect(page.getByRole('contentinfo')).toContainText('Все права защищены');
    expect(pageErrors).toEqual([]);
  });

  test('an address without a prefix is English, whatever the browser prefers', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ru-RU' });
    const page = await context.newPage();

    await page.goto('/games');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.en);
    await context.close();
  });

  test('links on a Russian page stay on Russian addresses', async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/ru/duels/public');

    await page.getByRole('navigation', { name: 'Основное' }).getByRole('link', { name: 'Игры' }).click();

    await expect(page).toHaveURL(/\/ru\/games$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
    expect(pageErrors).toEqual([]);
  });

  test('the switch loads the same page at the other language’s address, keeping the query and the hash', async ({ page }) => {
    // The hash stands in for a private duel's invite secret, which has to survive the switch.
    await page.goto('/games?q=chess#0xabc');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.en);
    const entries = await page.evaluate(() => history.length);

    await switchTo(page, 'RU', 'ru');

    await expect(page).toHaveURL(/\/ru\/games\?q=chess#0xabc$/);
    expect(await page.evaluate(() => history.length)).toBe(entries);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);

    await switchTo(page, 'EN', 'en');

    await expect(page).toHaveURL(/\/games\?q=chess#0xabc$/);
    await expect(page).not.toHaveURL(/\/ru\//);
  });
});
