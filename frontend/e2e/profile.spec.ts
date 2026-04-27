import { test, expect } from '@playwright/test';

test.describe('Owner profile page', () => {
  test('renders sign-in prompt when unauthenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText(/Sign in to set up your profile/i)).toBeVisible();
  });
});
