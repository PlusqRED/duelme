import { test, expect } from '@playwright/test';

const VALID_ADDR = '0x1234567890123456789012345678901234567890';

test.describe('Public profile page', () => {
  test('renders profile shell for a valid wallet address', async ({ page }) => {
    await page.goto(`/profile/${VALID_ADDR}`);
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
  });

  test('shows tabs row on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`/profile/${VALID_ADDR}`);
    await expect(page.getByRole('tab', { name: /battles/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /about/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /trophies/i })).toBeVisible();
  });

  test('shows stacked sections + sticky Challenge CTA on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/profile/${VALID_ADDR}`);
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /challenge/i })).toBeVisible();
  });

  test('rejects malformed addresses', async ({ page }) => {
    await page.goto('/profile/not-an-address');
    await expect(page.getByText(/not.found/i)).toBeVisible();
  });
});
