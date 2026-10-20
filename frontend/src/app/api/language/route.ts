import { NextResponse, type NextRequest } from 'next/server';
import { isLanguage, LANGUAGE_COOKIE, LANGUAGE_COOKIE_OPTIONS } from '@/i18n/language';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function refuse(status: number) {
  return new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * The language switch posts the reader's choice here and the cookie is set in the response; the
 * switch then loads its page anew. Only JSON is taken: another site's page cannot send it without
 * the browser asking this site first, which it never agrees to, even in a browser that does not
 * say where a request comes from.
 */
export async function POST(request: NextRequest) {
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') {
    return refuse(403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return refuse(415);
  }
  const body: unknown = await request.json().catch(() => null);
  const language = typeof body === 'object' && body !== null ? (body as { language?: unknown }).language : undefined;
  if (!isLanguage(language)) {
    return refuse(400);
  }
  const response = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(LANGUAGE_COOKIE, language, LANGUAGE_COOKIE_OPTIONS);
  return response;
}
