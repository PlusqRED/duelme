import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

test.describe('Landing', () => {
  test('lists its own sections in the bar and marks the one being read', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const pageErrors = collectPageErrors(page);
    await page.goto('/');
    const sections = page.getByRole('banner').getByRole('navigation', { name: 'Main' });
    await expect(sections.getByRole('link')).toHaveText(['Public duels', 'Recent duels', 'How it works', 'Safety']);

    await page.locator('#safety').scrollIntoViewIfNeeded();

    await expect(sections.getByRole('link', { name: 'Safety' })).toHaveAttribute('aria-current', 'location');
    await expect(sections.locator('[aria-current]')).toHaveCount(1);
    expect(pageErrors).toEqual([]);
  });

  test('shows any step of the demo duel and any ending', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const demo = page.locator('#demo');

    await demo.getByRole('button', { name: /Report/ }).click();
    await expect(demo.getByText('Waiting for confirmation')).toBeVisible();
    await expect(demo.getByText(/to respond$/)).toBeVisible();

    await demo.getByRole('button', { name: 'Stays silent' }).click();
    await expect(demo.getByRole('button', { name: 'Stays silent' })).toHaveAttribute('aria-pressed', 'true');
    await expect(demo.getByText('+1 abandoned', { exact: true })).toBeVisible();
    await expect(demo.getByRole('button', { name: 'Watch again' })).toBeVisible();
  });

  test('plays the demo duel to its end when asked', async ({ page }) => {
    await page.goto('/');
    const demo = page.locator('#demo');
    await demo.getByRole('button', { name: 'Create' }).click();

    await demo.getByRole('button', { name: 'Watch' }).click();

    await expect(demo.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(demo.getByText('Duel resolved')).toBeVisible({ timeout: 30_000 });
    await expect(demo.getByRole('button', { name: 'Confirms' })).toHaveAttribute('aria-pressed', 'true');
    await expect(demo.locator('[data-flight]')).toHaveCount(0);
  });

  test('opens the rest of the developer’s note on request', async ({ page }) => {
    await page.goto('/');
    const note = page.getByRole('complementary', { name: 'Built solo. For the community, not for profit.' });
    await expect(note.getByText(/Last update:/)).toBeVisible();

    await note.getByRole('button', { name: 'Read the note' }).click();

    await expect(note.getByText(/No investors, no salary/)).toBeVisible();
    await expect(note.getByRole('button', { name: 'Hide the note' })).toHaveAttribute('aria-expanded', 'true');
  });
});
