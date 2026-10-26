import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';

const requestHeaders = new Headers();

vi.mock('next/headers', () => ({ headers: async () => requestHeaders }));

const { pageMetadata } = await import('@/lib/pageMetadata');

const games = { path: '/games', title: 'Games', description: 'Pick a game.' };

afterEach(() => requestHeaders.delete(LANGUAGE_HEADER));

describe('pageMetadata', () => {
  it('names the page’s own address as canonical, in its language', async () => {
    requestHeaders.set(LANGUAGE_HEADER, 'ru');

    const metadata = await pageMetadata(games);

    expect(metadata.alternates?.canonical).toBe('/ru/games');
  });

  it('names the page in every language for search engines', async () => {
    const metadata = await pageMetadata(games);

    expect(metadata.alternates?.languages).toEqual({ en: '/games', ru: '/ru/games', 'x-default': '/games' });
  });

  it('gives a shared link the page’s own title, address and language, not the home page’s', async () => {
    requestHeaders.set(LANGUAGE_HEADER, 'ru');

    const metadata = await pageMetadata(games);

    expect(metadata.openGraph).toMatchObject({
      title: 'Games',
      description: 'Pick a game.',
      url: '/ru/games',
      locale: 'ru_RU',
      alternateLocale: ['en_US'],
    });
  });

  it('shows the share image in the page’s language', async () => {
    requestHeaders.set(LANGUAGE_HEADER, 'ru');

    const metadata = await pageMetadata(games);

    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: '/og/ru', width: 1200, height: 630 })]);
  });

  it('keeps a title that names the site itself whole, in the share preview too', async () => {
    const metadata = await pageMetadata({ ...games, path: '/', title: { absolute: 'DuelMe — duels' } });

    expect([metadata.title, metadata.openGraph?.title]).toEqual([{ absolute: 'DuelMe — duels' }, 'DuelMe — duels']);
  });

  it('lets search engines list a page and show its large image', async () => {
    const metadata = await pageMetadata(games);

    expect(metadata.robots).toMatchObject({ index: true, follow: true, googleBot: { 'max-image-preview': 'large' } });
  });

  it('keeps a private page out of search results, with no other languages to offer', async () => {
    const metadata = await pageMetadata({ ...games, path: '/dashboard', indexed: false });

    expect([metadata.robots, metadata.alternates?.languages]).toEqual([{ index: false, follow: true }, undefined]);
  });
});
