import { faqTranslations } from './translations/faq';
import { infoPagesTranslations } from './translations/infoPages';
import { pagePartsTranslations } from './translations/pageParts';
import { seoTranslations } from './translations/seo';

/**
 * The words only server components say: head tags, the FAQ, the explainer pages, the landing's heading
 * and the games' guides. Kept
 * out of `translations`, which every page's script carries whole for its client components, and
 * read through `getTranslation()` and `serverTranslator()` in `serverTranslation.ts`.
 */
export const pageTranslations = {
  en: {
    ...seoTranslations.en,
    ...faqTranslations.en,
    ...infoPagesTranslations.en,
    ...pagePartsTranslations.en,
  },
  ru: {
    ...seoTranslations.ru,
    ...faqTranslations.ru,
    ...infoPagesTranslations.ru,
    ...pagePartsTranslations.ru,
  },
} as const;

export type PageTranslationKey = keyof typeof pageTranslations.en;
