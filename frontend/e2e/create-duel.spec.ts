import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

/** The game catalogue, and no notes for its games: the backend is not run here. */
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
  await page.route('**/api/v1/games?**', (route) =>
    route.fulfill({ json: [game('dota-2', 'Dota 2', 'MOBA', 2), game('cs-2', 'CS 2', 'FPS', 2), game('chess', 'Chess', 'STRATEGY', 1)] })
  );
  await page.route('**/api/v1/duels/meta?**', (route) => route.fulfill({ json: [] }));
}

// Signed out: the whole duel can be set up, and signing in is the last thing it asks for.
test.describe('Create duel', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await serveGames(page);
  });

  test('sets the whole duel up signed out, then asks to sign in', async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await page.goto('/duel/create');

    await page.getByRole('button', { name: /CS 2/ }).click();
    const stake = page.getByRole('textbox', { name: 'Your stake' });
    await stake.fill('4,2');
    await expect(page.getByRole('region', { name: 'This duel' })).toContainText('4.2 USDT each');
    await stake.press('Enter');

    // The radio itself is hidden behind its card, which is what the player presses.
    await page.locator('label').filter({ has: page.getByRole('radio', { name: /Anyone/ }) }).click();
    await expect(page.getByRole('radio', { name: /Anyone/ })).toBeChecked();
    await page.getByRole('button', { name: 'Continue' }).filter({ visible: true }).click();
    const message = page.getByRole('textbox', { name: 'Message to your opponent' });
    await message.fill('  best of 3  ');
    await expect(page.getByText('9/')).toBeVisible();
    await message.press('Enter');

    await expect(page.getByText('Sign in to create it. Your settings stay.').filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' }).filter({ visible: true }).last()).toBeEnabled();
    expect(pageErrors).toEqual([]);
  });

  test('refuses a stake with more decimals than USDT has', async ({ page }) => {
    await page.goto('/duel/create');
    await page.getByRole('button', { name: /Chess/ }).click();

    await page.getByRole('textbox', { name: 'Your stake' }).fill('4.1234567');

    await expect(page.getByText('USDT has at most 6 decimal places.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' }).filter({ visible: true })).toBeDisabled();
  });

  test('sets the stake on the slider, past 500 included', async ({ page }) => {
    await page.goto('/duel/create');
    await page.getByRole('button', { name: /Chess/ }).click();
    const slider = page.getByRole('slider', { name: 'Stake' });

    await slider.focus();
    await page.keyboard.press('End');
    await expect(page.getByRole('textbox', { name: 'Your stake' })).toHaveValue('500');

    await page.getByRole('textbox', { name: 'Your stake' }).fill('750');
    await expect(slider).toHaveAttribute('aria-valuetext', /750/);
  });

  test('adds a game the catalogue lacks', async ({ page }) => {
    await page.goto('/duel/create');

    await page.getByRole('searchbox', { name: 'Search games' }).fill('Tekken 8');
    await page.getByRole('button', { name: 'Add “Tekken 8” as a new game' }).click();
    await page.getByRole('button', { name: 'Fighting' }).click();
    await page.getByRole('button', { name: 'Add and pick' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tekken 8');
  });

  test('keeps the setup through a reload', async ({ page }) => {
    await page.goto('/duel/create');
    await page.getByRole('button', { name: /Dota 2/ }).click();
    await page.getByRole('textbox', { name: 'Your stake' }).fill('25');

    await page.reload();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dota 2');
    await expect(page.getByRole('region', { name: 'This duel' })).toContainText('25 USDT each');
  });
});
