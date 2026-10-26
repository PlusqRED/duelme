import { isLanguage, LANGUAGES } from '@/i18n/language';
import { renderBrandOgImage } from '@/lib/ogImage';

export const runtime = 'nodejs';
/** Drawn once per language at build: the image never changes between requests. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGUAGES.map((language) => ({ language }));
}

/** The share image every page names in its Open Graph tags, in the page's language. */
export async function GET(_request: Request, { params }: { params: Promise<{ language: string }> }) {
  const { language } = await params;
  return isLanguage(language) ? renderBrandOgImage(language) : new Response(null, { status: 404 });
}
