import { NextResponse, type NextRequest } from 'next/server';
import { LANGUAGE_COOKIE, LANGUAGE_COOKIE_OPTIONS, parseLanguage } from '@/i18n/language';
import { LANGUAGE_FIELDS, returnPath } from '@/i18n/languageSwitch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The language switch posts here. The cookie is set in the response and the reader goes back to the
 * page they were on, which loads anew in that language: a full load, so no part of the page and no
 * request in flight is left in the old one.
 */
export async function POST(request: NextRequest) {
  // Another site's form could only flip the reader's language, but nothing calls for letting it.
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') {
    return new NextResponse(null, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) {
    return new NextResponse(null, { status: 400 });
  }
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: returnPath(form.get(LANGUAGE_FIELDS.back)), 'Cache-Control': 'no-store' },
  });
  response.cookies.set(LANGUAGE_COOKIE, parseLanguage(form.get(LANGUAGE_FIELDS.language)), LANGUAGE_COOKIE_OPTIONS);
  return response;
}
