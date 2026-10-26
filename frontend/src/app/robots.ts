import type { MetadataRoute } from 'next';
import { LANGUAGES } from '@/i18n/language';
import { localePath } from '@/i18n/localePath';
import { SITE_URL } from '@/lib/constants';

/** A player's own pages: nothing in them is for a search engine. */
const PRIVATE_PAGES = ['/dashboard'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', ...LANGUAGES.flatMap((language) => PRIVATE_PAGES.map((page) => localePath(page, language)))],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
