import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER, LANGUAGES } from '@/i18n/language';
import { pageTranslations, type PageTranslationKey } from '@/i18n/pageTranslations';
import { RESULT_DESCRIPTION_LIMIT, RESULT_TITLE_LIMIT, resultTitle } from './helpers/searchResult';

const requestHeaders = new Headers();

vi.mock('next/headers', () => ({ headers: async () => requestHeaders }));

const { pageMetadata } = await import('@/lib/pageMetadata');

const games = { path: '/games', title: 'Games', description: 'Pick a game.' };

afterEach(() => {
  requestHeaders.delete(LANGUAGE_HEADER);
  vi.unstubAllEnvs();
});

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

  it('gives the share image a new address with each release, so cached previews take up a new one', async () => {
    vi.stubEnv('APP_RELEASE', 'abc123');

    const metadata = await pageMetadata(games);

    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: '/og/en?v=abc123' })]);
  });

  it('keeps a title that names the site itself whole, in the share preview too', async () => {
    const metadata = await pageMetadata({ ...games, path: '/', title: { absolute: 'DuelMe — duels' } });

    expect([metadata.title, metadata.openGraph?.title]).toEqual([{ absolute: 'DuelMe — duels' }, 'DuelMe — duels']);
  });

  it('lets search engines list a page and show its large image', async () => {
    const metadata = await pageMetadata(games);

    expect(metadata.robots).toMatchObject({ index: true, follow: true, googleBot: { 'max-image-preview': 'large' } });
  });

  it('keeps a page the list leaves out of search results, with no other languages to offer', async () => {
    const metadata = await pageMetadata({ ...games, path: '/duel/7' });

    expect([metadata.robots, metadata.alternates?.languages]).toEqual([{ index: false, follow: true }, undefined]);
  });

  it('lists a game’s page only when it has a guide', async () => {
    const [guided, unguided] = await Promise.all([
      pageMetadata({ ...games, path: '/games/cs2' }),
      pageMetadata({ ...games, path: '/games/lineage-2' }),
    ]);

    expect([guided.robots, unguided.robots]).toEqual([expect.objectContaining({ index: true }), { index: false, follow: true }]);
  });
});

describe('search copy', () => {
  const seoKeys = (Object.keys(pageTranslations.en) as PageTranslationKey[]).filter((key) => key.startsWith('seo.'));

  it.each(LANGUAGES)('keeps every %s title whole in a result once the site’s name follows it', (language) => {
    const long = seoKeys.filter((key) => key.endsWith('.title') && key !== 'seo.home.title');

    expect(long.filter((key) => resultTitle(pageTranslations[language][key]).length > RESULT_TITLE_LIMIT)).toEqual([]);
  });

  it.each(LANGUAGES)('keeps every %s description within what a result shows', (language) => {
    expect(
      seoKeys.filter((key) => key.endsWith('.description') && pageTranslations[language][key].length > RESULT_DESCRIPTION_LIMIT)
    ).toEqual([]);
  });
});
