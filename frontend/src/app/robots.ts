import type { MetadataRoute } from 'next';
import { LANGUAGES } from '@/i18n/language';
import { localePath } from '@/i18n/localePath';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // A player's own duels: nothing in them is for a search engine.
        disallow: ['/api/', ...LANGUAGES.map((language) => localePath('/dashboard', language))],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
