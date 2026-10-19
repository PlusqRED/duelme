import { test, expect } from '@playwright/test';

test.describe('Public Duels', () => {
  test('/duels/public page loads with title', async ({ page }) => {
    await page.goto('/duels/public');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Public Duels|Публичные дуэли/);
  });

  test('/duels/public shows content or empty state', async ({ page }) => {
    await page.goto('/duels/public');
    await expect(page.getByText(/No public duels|Публичных дуэлей пока нет|USDT/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('Header has Public Duels navigation link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: /Public duels|Публичные дуэли/ })).toBeVisible();
  });
});
