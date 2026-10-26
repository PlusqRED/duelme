import type { MetadataRoute } from 'next';
import { LANGUAGES } from '@/i18n/language';
import { localePath } from '@/i18n/localePath';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // The backend's reads (`/api/v1/`) stay open: a crawler rendering the catalog or the duel
        // lists fetches them as the browser does, and the longer rule wins over `/api/`.
        allow: ['/', '/api/v1/'],
        // The page server's own API (the relayer, health), and a player's own duels.
        disallow: ['/api/', ...LANGUAGES.map((language) => localePath('/dashboard', language))],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
