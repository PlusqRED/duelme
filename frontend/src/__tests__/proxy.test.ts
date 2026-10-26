import { getRewrittenUrl, isRewrite, unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { config, proxy } from '@/proxy';

const SITE = 'https://duelme.pro';

function visit(path: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(`${SITE}${path}`, { headers }));
}

/** The language header the page will read: Next carries a proxy's request headers as `x-middleware-request-*`. */
function languageFor(response: Response): string | null {
  return response.headers.get(`x-middleware-request-${LANGUAGE_HEADER}`);
}

describe('proxy', () => {
  it('serves a Russian address from the route of the same page', () => {
    const response = visit('/ru/games?q=chess');

    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${SITE}/games?q=chess`);
    expect(languageFor(response)).toBe('ru');
  });

  it('serves the Russian home page from the home route', () => {
    const response = visit('/ru');

    expect(getRewrittenUrl(response)).toBe(`${SITE}/`);
    expect(languageFor(response)).toBe('ru');
  });

  it('serves an address without a prefix as it is, in English', () => {
    const response = visit('/games');

    expect(isRewrite(response)).toBe(false);
    expect(languageFor(response)).toBe('en');
  });

  it('overwrites a language header the browser sent itself', () => {
    expect(languageFor(visit('/games', { [LANGUAGE_HEADER]: 'ru' }))).toBe('en');
  });

  it('gives the API no Russian address', () => {
    expect(isRewrite(visit('/ru/api/health'))).toBe(false);
  });
});

describe('proxy matcher', () => {
  it.each(['/', '/games', '/ru', '/ru/duel/7', '/og/en', '/ru/og/ru'])('runs for %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each(['/api/relay', '/_next/static/chunks/app.js', '/t/script.js', '/robots.txt', '/sitemap.xml'])(
    'leaves %s alone',
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
  );
});
