import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_COOKIE } from '@/i18n/language';
import { POST } from '../route';

const JSON_TYPE = { 'content-type': 'application/json' };

function post(body: string, headers: Record<string, string> = { ...JSON_TYPE, 'sec-fetch-site': 'same-origin' }) {
  return POST(new NextRequest('https://dev.duelme.pro/api/language', { method: 'POST', body, headers }));
}

describe('POST /api/language', () => {
  it('keeps the language for a year, set by the server so Safari keeps it that long', async () => {
    const response = await post('{"language":"ru"}');

    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.cookies.get(LANGUAGE_COOKIE)).toMatchObject({
      value: 'ru',
      path: '/',
      maxAge: 31_536_000,
      sameSite: 'lax',
    });
  });

  it('takes JSON with its charset named', async () => {
    const response = await post('{"language":"en"}', { 'content-type': 'application/json; charset=utf-8' });

    expect(response.status).toBe(204);
  });

  it('takes a post without the browser naming where from, as older browsers do', async () => {
    const response = await post('{"language":"ru"}', JSON_TYPE);

    expect(response.status).toBe(204);
  });

  it.each(['cross-site', 'same-site'])('refuses a post from another site (%s)', async (site) => {
    const response = await post('{"language":"ru"}', { ...JSON_TYPE, 'sec-fetch-site': site });

    expect(response.status).toBe(403);
    expect(response.cookies.get(LANGUAGE_COOKIE)).toBeUndefined();
  });

  it.each([
    ['a form', 'application/x-www-form-urlencoded'],
    ['plain text', 'text/plain'],
  ])('refuses %s, which another site’s page could send without asking', async (_, type) => {
    const response = await post('language=ru', { 'content-type': type });

    expect(response.status).toBe(415);
    expect(response.cookies.get(LANGUAGE_COOKIE)).toBeUndefined();
  });

  it.each([
    ['a language the site does not have', '{"language":"de"}'],
    ['a value that is no language', '{"language":"<script>"}'],
    ['no language', '{}'],
    ['a body that is not an object', '"ru"'],
    ['JSON that does not parse', '{"language":'],
    ['an empty body', ''],
  ])('refuses %s, keeping the reader’s cookie as it was', async (_, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(response.cookies.get(LANGUAGE_COOKIE)).toBeUndefined();
  });
});
