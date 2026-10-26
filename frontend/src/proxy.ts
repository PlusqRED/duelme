import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LANGUAGE, LANGUAGE_HEADER } from '@/i18n/language';
import { languageOfPath, stripLanguage } from '@/i18n/localePath';

/**
 * Marks a request this proxy already routed. Next sends a rewrite whose origin differs from the
 * server's own (a dev server on 127.0.0.1, which Next's URLs call localhost) back through the proxy
 * as a new request, which would read the bare address as English. A value fresh in every process,
 * so no browser can send it.
 */
const ROUTED_HEADER = 'x-duelme-routed';
const ROUTED_MARK = crypto.randomUUID();

/**
 * The address names the language. `/ru/games` is served by the `/games` route with the language
 * header set to Russian; an address without a prefix is English. The header is set on every request,
 * so one a browser sent itself never reaches the page.
 */
export function proxy(request: NextRequest) {
  if (request.headers.get(ROUTED_HEADER) === ROUTED_MARK) {
    return NextResponse.next();
  }
  const { pathname } = request.nextUrl;
  const language = languageOfPath(pathname);
  const headers = new Headers(request.headers);
  headers.set(LANGUAGE_HEADER, language);
  headers.delete(ROUTED_HEADER);

  const page = stripLanguage(pathname);
  // The API and the files beside the pages have one address, without a language.
  if (language === DEFAULT_LANGUAGE || page.startsWith('/api/')) {
    return NextResponse.next({ request: { headers } });
  }
  headers.set(ROUTED_HEADER, ROUTED_MARK);
  const url = request.nextUrl.clone();
  url.pathname = page;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Pages and the images made for them; never the API, the build's files or the analytics tracker.
  matcher: ['/((?!api/|_next/|t/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$).*)'],
};
