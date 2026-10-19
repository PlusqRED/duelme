import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

/** The game catalogue, with Dota 2 played and Chess not finished yet: the backend is not run here. */
async function serveGames(page: Page) {
  const game = (slug: string, name: string, category: string, duelCount: number) => ({
    slug,
    name,
    iconUrl: null,
    category,
    duelCount,
    createdAt: null,
    updatedAt: null,
  });
  await page.route('**/api/v1/games', (route) =>
    route.fulfill({ json: [game('dota-2', 'Dota 2', 'MOBA', 2), game('chess', 'Chess', 'STRATEGY', 1)] })
  );
  // Every duel asked about was a Dota 2 duel, so none was a Chess one.
  await page.route('**/api/v1/duels/meta?gameSlug=chess&**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/duels/meta/batch?**', (route) => {
    const url = new URL(route.request().url());
    const ids = url.searchParams.get('duelIds')?.split(',') ?? [];
    route.fulfill({
      json: ids.map((id) => ({
        duelId: Number(id),
        chainId: Number(url.searchParams.get('chainId')),
        contractAddress: url.searchParams.get('contractAddress'),
        gameSlug: 'dota-2',
        gameName: 'Dota 2',
        category: 'MOBA',
        creatorAddress: '0x0000000000000000000000000000000000000001',
        createdAt: null,
      })),
    });
  });
}

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

  test('shows the open public duels, or the way to make one', async ({ page }) => {
    await serveGames(page);
    await page.goto('/');
    const open = page.locator('#public-duels');

    await expect(open.getByRole('heading', { name: 'Public duels' })).toBeVisible();
    await expect(
      open.getByRole('link', { name: /^Join for|^View Duel$/ }).or(open.getByRole('heading', { name: /No public duels/ })).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('filters the recent duels by a game and opens one into where its money went', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await serveGames(page);
    await page.goto('/');
    const recent = page.locator('#recent-duels');
    const rows = recent.getByRole('button', { name: /^Dota 2 #\d+/ });
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });

    await rows.first().click();
    await expect(recent.getByText('To the winner').filter({ visible: true })).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute('aria-expanded', 'true');

    await recent.getByRole('button', { name: /^Chess Strategy/ }).click();
    await expect(recent.getByText('No finished Chess duels yet.')).toBeVisible();

    await recent.getByRole('button', { name: /^Only Chess/ }).click();
    await expect(rows.first()).toBeVisible();
  });

  test('walks the first-duel quest to its end, and on to a duel to create', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const start = page.locator('#getting-started');

    for (let move = 0; move < 3; move++) {
      await start.getByRole('button', { name: 'Next step' }).click();
    }
    await start.getByRole('button', { name: 'Finish' }).click();

    await expect(start.getByText('All 4 steps done')).toBeVisible();
    await expect(start.getByRole('link', { name: 'Create a duel' })).toBeFocused();
  });

  test('copies the escrow contract’s address', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    const safety = page.locator('#safety');

    await safety.getByRole('button', { name: 'Copy address' }).click();

    await expect(safety.getByText('Address copied')).toBeVisible();
  });

  test('moves the sample player along the reputation scale', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const lab = page.locator('#player-trust');

    await lab.getByRole('button', { name: '+1 honored' }).click();
    await expect(lab.getByText(/^Some useful history/)).toBeVisible();
    await lab.getByRole('button', { name: '+1 abandoned' }).click();

    await expect(lab.getByText(/^Too many ignored/)).toBeVisible();
  });
});
