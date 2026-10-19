import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_COOKIE } from '@/i18n/language';
import { saveLanguage } from '@/i18n/saveLanguage';

const jar = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock('next/headers', () => ({ cookies: async () => jar }));

beforeEach(() => {
  jar.set.mockClear();
});

describe('saveLanguage', () => {
  it('keeps the language for a year on every page of the site', async () => {
    await saveLanguage('ru');

    expect(jar.set).toHaveBeenCalledWith(LANGUAGE_COOKIE, 'ru', { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
  });

  it('keeps English for anything that is not a language, since anyone can call it', async () => {
    await saveLanguage('<script>');

    expect(jar.set).toHaveBeenCalledWith(LANGUAGE_COOKIE, 'en', expect.anything());
  });
});
