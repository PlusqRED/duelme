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

  // Duel 0 is whatever the deployed contract holds, in whatever state: the page around it is the same.
  test('a duel shows whose move it is, its facts and its history', async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto('/duel/0');

    const facts = page.getByRole('region', { name: 'This duel' });
    await expect(facts.or(page.getByText(/Duel not found/))).toBeVisible({ timeout: 20_000 });
    test.skip(!(await facts.isVisible()), 'The deployed contract has no duel 0 yet.');

    await expect(page.getByText(/^(Your move|Their move|Watching|Duel over)$/)).toBeVisible();
    await expect(facts.getByText('Platform fee')).toBeVisible();
    await expect(facts.getByRole('link')).toHaveAttribute('href', /\/address\/0x[0-9a-fA-F]{40}$/);
    await expect(page.getByRole('region', { name: 'History' }).getByRole('listitem').first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
