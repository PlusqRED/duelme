// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { pageTranslations } from '@/i18n/pageTranslations';
import { translations } from '@/i18n/translations';
import { renderIn } from '@/lib/__tests__/helpers/renderIn';
import { DEVLOG_URL } from '@/lib/constants';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ [LANGUAGE_HEADER]: 'ru' }),
}));

const { Footer } = await import('@/components/layout/Footer');

afterEach(cleanup);

describe('Footer', () => {
  it('arrives from the server in the reader\'s language', async () => {
    render(await Footer());

    expect(screen.getByText(translations.ru['footer.tagline'])).toBeTruthy();
  });

  it('links the privacy page in the reader’s language', async () => {
    renderIn('ru', await Footer());

    expect(screen.getByRole('link', { name: translations.ru['footer.privacy'] }).getAttribute('href')).toBe('/ru/privacy');
  });

  it('links the pages that explain DuelMe, in the reader’s language', async () => {
    renderIn('ru', await Footer());
    const nav = screen.getByRole('navigation', { name: pageTranslations.ru['footer.pages'] });

    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/ru/how-it-works',
      '/ru/safety',
      '/ru/games',
      '/ru/about',
      '/ru/privacy',
    ]);
  });

  it('links the devlog by name in a new tab, and no other place off the site', async () => {
    render(await Footer());
    const offSite = screen.getAllByRole('link').filter((link) => !link.getAttribute('href')?.startsWith('/'));

    expect(
      offSite.map((link) => [link.getAttribute('href'), link.getAttribute('aria-label'), link.getAttribute('target'), link.getAttribute('rel')])
    ).toEqual([[DEVLOG_URL, pageTranslations.ru['about.contact.devlog'], '_blank', 'noopener noreferrer']]);
  });
});
