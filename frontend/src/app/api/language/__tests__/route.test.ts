import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_COOKIE } from '@/i18n/language';
import { POST } from '../route';

function post(fields: Record<string, string>, headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) {
  return POST(
    new NextRequest('https://dev.duelme.pro/api/language', { method: 'POST', body: new URLSearchParams(fields), headers })
  );
}

describe('POST /api/language', () => {
  it('keeps the language for a year and sends the reader back to their page, hash and all', async () => {
    const response = await post({ language: 'ru', back: '/duel/7?from=list#0xabc' });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/duel/7?from=list#0xabc');
    expect(response.cookies.get(LANGUAGE_COOKIE)).toMatchObject({
      value: 'ru',
      path: '/',
      maxAge: 31_536_000,
      sameSite: 'lax',
    });
  });

  it('keeps English for anything that is not a language, since anyone can post here', async () => {
    const response = await post({ language: '<script>', back: '/games' });

    expect(response.cookies.get(LANGUAGE_COOKIE)?.value).toBe('en');
  });

  it('sends the reader home when the page to go back to is missing', async () => {
    const response = await post({ language: 'ru' });

    expect(response.headers.get('location')).toBe('/');
  });

  it('takes a form posted without the browser naming where from, as older browsers do', async () => {
    const response = await post({ language: 'ru', back: '/games' }, {});

    expect(response.status).toBe(303);
  });

  it.each(['cross-site', 'same-site'])('refuses a form posted from another site (%s)', async (site) => {
    const response = await post({ language: 'ru', back: '/games' }, { 'sec-fetch-site': site });

    expect(response.status).toBe(403);
    expect(response.cookies.get(LANGUAGE_COOKIE)).toBeUndefined();
  });

  it('refuses a body that is not a form', async () => {
    const response = await POST(
      new NextRequest('https://dev.duelme.pro/api/language', {
        method: 'POST',
        body: '{"language":"ru"}',
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(response.status).toBe(400);
  });
});
