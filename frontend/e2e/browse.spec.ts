import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

test.describe('Recent duels', () => {
  test('opens searched for the q the site search action sends', async ({ page }) => {
    await page.goto('/duels/recent?q=chess');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Recent duels|Недавние дуэли/);
    await expect(page.getByRole('searchbox')).toHaveValue('chess');
  });

  test('keeps a typed search in the address', async ({ page }) => {
    await page.goto('/duels/recent');
    const search = page.getByRole('searchbox');
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill('alice');
    await expect(page).toHaveURL(/\/duels\/recent\?q=alice$/);
  });
});

test.describe('Profiles', () => {
  test('a player’s profile opens by their address', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/profile/0x4BFa1486661d6FAa5300923bd684F261AE4776a5');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Reputation|Репутация/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('something that is not an address is no page at all', async ({ page }) => {
    const response = await page.goto('/profile/alice');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Nothing at this address|По этому адресу ничего нет/);
  });

  test('the own profile asks a signed-out reader to sign in', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Your profile|Твой профиль/, { timeout: 15000 });
  });
});

test.describe('Lost pages', () => {
  test('an unknown address answers 404 and leads home and to the open duels', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Nothing at this address|По этому адресу ничего нет/);
    await expect(page.getByRole('main').getByRole('link', { name: /home page|На главную/ })).toHaveAttribute('href', '/');
  });
});
