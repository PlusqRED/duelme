import type { Metadata } from 'next';
import { intlLocales } from '@/i18n/intlLocales';
import { LANGUAGES } from '@/i18n/language';
import { languageAddresses, localePath } from '@/i18n/localePath';
import { getTranslation } from '@/i18n/serverTranslation';
import type { Language } from '@/i18n/translations';
import { SITE_NAME } from '@/lib/constants';
import { isIndexed } from '@/lib/indexedPages';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, shareImagePath } from '@/lib/ogImage';

/** Open Graph writes a locale with an underscore: `ru_RU`. */
function openGraphLocale(language: Language): string {
  return intlLocales[language].replace('-', '_');
}

/** Large image previews and whole snippets: Google otherwise keeps both short. */
const INDEXED: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
};

/** Its links still lead a search engine on to the pages it may list. */
const UNINDEXED: Metadata['robots'] = { index: false, follow: true };

export interface PageMetadataInput {
  /** The page's address in English, the language without a prefix: `/games`. Listed in search results only if `INDEXED_PAGES` has it. */
  path: string;
  /** The page's own name, which the root layout follows with the site's; `absolute` keeps it as is. */
  title: string | { absolute: string };
  description: string;
}

/**
 * A page's head tags in the language of its address: its canonical address, the same page in the
 * other languages, and the title, description and image a shared link shows. Every page sets them
 * all, because Next.js would otherwise hand a page the Open Graph tags of the nearest layout that
 * has them, home page address included.
 */
export async function pageMetadata({ path, title, description }: PageMetadataInput): Promise<Metadata> {
  const { t, language } = await getTranslation();
  const address = localePath(path, language);
  const indexed = isIndexed(path);

  return {
    title,
    description,
    alternates: { canonical: address, languages: indexed ? languageAddresses(path) : undefined },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: typeof title === 'string' ? title : title.absolute,
      description,
      url: address,
      locale: openGraphLocale(language),
      alternateLocale: LANGUAGES.filter((other) => other !== language).map(openGraphLocale),
      images: [{ url: shareImagePath(language), ...OG_IMAGE_SIZE, type: OG_IMAGE_CONTENT_TYPE, alt: t('seo.image.alt') }],
    },
    twitter: { card: 'summary_large_image' },
    robots: indexed ? INDEXED : UNINDEXED,
  };
}
