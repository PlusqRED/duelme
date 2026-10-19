// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitch } from '@/components/header/LanguageSwitch';
import { LanguageContext } from '@/i18n/LanguageContext';
import { LANGUAGE_COOKIE } from '@/i18n/language';
import { translator } from '@/i18n/translate';
import { translations, type Language } from '@/i18n/translations';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: toastError, info: vi.fn(), success: vi.fn() } }));

const reload = vi.fn();
const fetchMock = vi.fn();

/** The server's answer to a good post: it sets the cookie the browser then keeps. */
function serverKeeps(language: Language) {
  fetchMock.mockImplementation(async () => {
    setCookie(language);
    return new Response(null, { status: 204 });
  });
}

function setCookie(language: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/`;
}

function renderIn(language: Language) {
  render(
    <LanguageContext.Provider value={{ language, ...translator(language) }}>
      <LanguageSwitch />
    </LanguageContext.Provider>
  );
}

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

beforeEach(() => {
  // A date in the past: happy-dom keeps a cookie with `max-age=0` until its clock ticks over.
  document.cookie = `${LANGUAGE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(window.location, 'reload').mockImplementation(reload);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  reload.mockReset();
  toastError.mockClear();
});

describe('LanguageSwitch', () => {
  it('slides the pill to the language pressed at once, while the post is out', async () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    renderIn('en');

    await press('RU');

    expect(screen.getByRole('button', { name: 'RU' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('group').style.getPropertyValue('--pick')).toBe('1');
  });

  it('slides the pill back when the language did not change', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    renderIn('en');

    await press('RU');

    expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('names the choice it offers', () => {
    renderIn('ru');

    expect(screen.getByRole('group', { name: translations.ru['nav.language'] })).toBeTruthy();
  });

  it('posts the language as JSON, then loads the same page anew', async () => {
    serverKeeps('ru');
    renderIn('en');

    await press('RU');

    expect(fetchMock).toHaveBeenCalledWith('/api/language', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"language":"ru"}',
      signal: expect.any(AbortSignal),
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('marks the language shown and does nothing when it is pressed', async () => {
    setCookie('ru');
    renderIn('ru');

    await press('RU');

    expect(screen.getByRole('button', { name: 'RU' }).getAttribute('aria-pressed')).toBe('true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('takes no cookie as English, the language the server then shows', async () => {
    renderIn('en');

    await press('EN');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the language shown again when another tab chose a different one', async () => {
    setCookie('ru');
    serverKeeps('en');
    renderIn('en');

    await press('EN');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('lets a press while the post is out correct it: the last press wins', async () => {
    fetchMock.mockImplementationOnce(
      (_: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))))
    );
    renderIn('en');
    await press('RU');
    serverKeeps('en');

    await press('EN');

    expect(fetchMock.mock.calls.map(([, init]) => init.body)).toEqual(['{"language":"ru"}', '{"language":"en"}']);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(toastError).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the server refuses', async () => new Response(null, { status: 400 })],
    ['the network fails', async () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('says the language did not change when %s, and stays', async (_, answer) => {
    fetchMock.mockImplementation(answer);
    renderIn('en');

    await press('RU');

    expect(toastError).toHaveBeenCalledWith(translations.en['toast.languageNotSaved']);
    expect(reload).not.toHaveBeenCalled();
  });

  it('says why nothing changes when the browser keeps no cookies', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    renderIn('en');

    await press('RU');

    expect(toastError).toHaveBeenCalledWith(translations.en['toast.languageNotKept']);
    expect(reload).not.toHaveBeenCalled();
  });
});
