import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

const GAMES_HEADING = { en: 'Game Catalog', ru: 'Каталог игр' };

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

    await page.getByRole('button', { name: 'RU', exact: true }).first().click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(GAMES_HEADING.ru);
  });
});
