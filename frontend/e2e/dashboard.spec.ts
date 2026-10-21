import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

test.describe('My duels, signed out', () => {
  test('invites a guest to sign in, beside the public duels and Create a duel', async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1, name: 'My duels' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in to see your duels' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Public duels' })).toHaveAttribute('href', '/duels/public');
    await expect(page.getByRole('main').getByRole('link', { name: 'Create a duel' })).toHaveAttribute('href', '/duel/create');
    expect(pageErrors).toEqual([]);
  });

  test('speaks Russian to a reader who chose it', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'duelme-lang', value: 'ru', url: baseURL ?? 'http://127.0.0.1:3001' }]);

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1, name: 'Мои дуэли' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Войди, чтобы увидеть свои дуэли' })).toBeVisible();
  });

  test('fits a phone without scrolling sideways', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Sign in to see your duels' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
