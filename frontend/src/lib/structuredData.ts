import { LANGUAGES } from '@/i18n/language';
import { absoluteAddress, localePath } from '@/i18n/localePath';
import type { Language } from '@/i18n/translations';
import { DEVLOG_URL, SITE_NAME, SITE_URL, SOURCE_CODE_URL } from './constants';

/** One schema.org object as a page carries it in JSON-LD. */
export type StructuredData = Record<string, unknown>;

export interface BreadcrumbItem {
  name: string;
  /** The page's address in English, as a link to it is written: `/games`. */
  path: string;
}

const ORGANIZATION_ID = `${SITE_URL}#organization`;

/** Who runs the site: the brand, its logo and the places it also lives under its own name. */
export function organizationSchema(description: string): StructuredData {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png`, width: 512, height: 512 },
    description,
    sameAs: [DEVLOG_URL, SOURCE_CODE_URL],
  };
}

/** The site as an application in a browser, free to use: the platform takes no fee. */
export function webApplicationSchema(description: string): StructuredData {
  return {
    '@type': 'WebApplication',
    '@id': `${SITE_URL}#webapp`,
    name: SITE_NAME,
    alternateName: ['Duel Me'],
    url: SITE_URL,
    description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript.',
    inLanguage: [...LANGUAGES],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/** The way from the home page down to this one, each step a page of the site in the reader's language. */
export function breadcrumbSchema(items: readonly BreadcrumbItem[], language: Language): StructuredData {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteAddress(localePath(item.path, language)),
    })),
  };
}

/**
 * The script tag's text. `<` is escaped so that no value — a game's name comes from players — can
 * close the tag and start markup of its own; JSON reads `<` back as the same character.
 */
export function serializeStructuredData(data: StructuredData): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
}
