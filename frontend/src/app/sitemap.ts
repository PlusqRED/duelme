import type { MetadataRoute } from 'next';
import { LANGUAGES } from '@/i18n/language';
import { languageAddresses, localePath } from '@/i18n/localePath';
import { SITE_URL } from '@/lib/constants';
import { GAME_GUIDES } from '@/lib/gameGuides';

/** The pages a search engine should list, by their English address: a game's only with its guide. */
const INDEXED_PAGES = [
  '/',
  '/games',
  ...GAME_GUIDES.map((guide) => `/games/${guide.slug}`),
  '/duels/public',
  '/duels/recent',
  '/duel/create',
  '/privacy',
];

/** An address on the site as a search engine reads it: whole, and the home page with no trailing slash. */
function absolute(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * Every listed page in every language, each with its versions in the others. No change dates and no
 * priorities: the pages change with the duels played on them, and Google ignores a date it cannot
 * trust and priorities altogether.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_PAGES.flatMap((path) => {
    const languages = Object.fromEntries(
      Object.entries(languageAddresses(path)).map(([language, address]) => [language, absolute(address)])
    );
    return LANGUAGES.map((language) => ({ url: absolute(localePath(path, language)), alternates: { languages } }));
  });
}
