import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

test.describe('Duel page', () => {
  test('an address that names no duel says so, with a way back', async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto('/duel/not-a-number');

    await expect(page.getByText(/Duel not found/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Public duels' }).first()).toHaveAttribute('href', '/duels/public');
    expect(pageErrors).toEqual([]);
  });
});
