import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers/pageErrors';

const SECTIONS = ['Public duels', 'Recent duels', 'Games'];

function menuButton(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: 'Menu' });
}

test.describe('Header', () => {
  test('lists the sections in the bar on a wide screen and marks the one you are in', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const pageErrors = collectPageErrors(page);

    await page.goto('/games');

    const sections = page.getByRole('banner').getByRole('navigation', { name: 'Main' });
    await expect(sections.getByRole('link')).toHaveText(SECTIONS);
    await expect(sections.getByRole('link', { name: 'Games' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('banner').getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(menuButton(page)).toBeHidden();
    expect(pageErrors).toEqual([]);
  });

  test('puts the sections and the language in a sheet on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/games');
    await expect(page.getByRole('banner').getByRole('group', { name: 'Language' })).toBeHidden();

    await menuButton(page).click();

    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await expect(sheet.getByRole('link')).toHaveText(SECTIONS);
    await expect(sheet.getByRole('group', { name: 'Language' })).toBeVisible();
  });

  test('leaves the language in the bar where there is room for it', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto('/games');

    await menuButton(page).click();

    const panel = page.getByRole('dialog', { name: 'Menu' });
    await expect(panel.getByRole('link')).toHaveText(SECTIONS);
    await expect(panel.getByRole('group', { name: 'Language' })).toBeHidden();
    await expect(page.getByRole('banner').getByRole('group', { name: 'Language' })).toBeVisible();
  });

  test('closes the menu on Escape and gives the focus back to its button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/games');
    await menuButton(page).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test('closes the menu when you follow a section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/games');
    await menuButton(page).click();

    await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Recent duels' }).click();

    await expect(page).toHaveURL(/\/duels\/recent$/);
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });

  test('draws its lower edge once the page scrolls under it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto('/games');
    const bar = page.getByRole('banner');
    const edge = () => bar.evaluate((node) => getComputedStyle(node).borderBottomColor);
    const atTop = await edge();

    await page.mouse.wheel(0, 400);

    await expect.poll(edge).not.toBe(atTop);
  });
});
