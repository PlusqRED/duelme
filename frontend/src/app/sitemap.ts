import type { MetadataRoute } from 'next';
import { LANGUAGES } from '@/i18n/language';
import { absoluteAddress, languageAddresses } from '@/i18n/localePath';
import { INDEXED_PAGES } from '@/lib/indexedPages';

/**
 * Every listed page in every language, each with its versions in the others. No change dates and no
 * priorities: the pages change with the duels played on them, and Google ignores a date it cannot
 * trust and priorities altogether.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_PAGES.flatMap((path) => {
    const languages = Object.fromEntries(
      Object.entries(languageAddresses(path)).map(([language, address]) => [language, absoluteAddress(address)])
    );
    return LANGUAGES.map((language) => ({ url: languages[language], alternates: { languages } }));
  });
}
