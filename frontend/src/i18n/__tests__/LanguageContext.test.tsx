// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { LANGUAGE_COOKIE } from '@/i18n/language';
import { translations, type Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

// One router for the whole app, as Next gives it.
const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

function LanguageProbe() {
  const { t } = useTranslation();
  return <p>{t('footer.rights')}</p>;
}

function app(language: Language): ReactNode {
  return (
    <LanguageProvider language={language}>
      <LanguageProbe />
    </LanguageProvider>
  );
}

function chooseInAnotherTab(language: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/`;
}

beforeEach(() => {
  // A date in the past: happy-dom keeps a cookie with `max-age=0` until its clock ticks over.
  document.cookie = `${LANGUAGE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
});

afterEach(() => {
  cleanup();
  router.refresh.mockClear();
});

describe('LanguageProvider', () => {
  it('speaks the language the layout gives it', () => {
    render(app('ru'));

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });

  it('follows the language a refreshed page brings', () => {
    const { rerender } = render(app('en'));

    rerender(app('ru'));

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });

  it('fetches its page again when another tab chose a language while this one was loading', () => {
    chooseInAnotherTab('ru');

    render(app('en'));

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('fetches nothing without a cookie', () => {
    render(app('en'));

    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('fetches nothing while the cookie names the language shown', () => {
    render(app('en'));
    chooseInAnotherTab('en');

    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('fetches once when coming back fires both visibilitychange and focus', () => {
    render(app('en'));
    chooseInAnotherTab('ru');

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['is shown again', () => document.dispatchEvent(new Event('visibilitychange'))],
    ['comes back from the back/forward cache', () => window.dispatchEvent(new Event('pageshow'))],
    ['is focused, having stayed in view beside the other', () => window.dispatchEvent(new Event('focus'))],
  ])('catches up with another tab’s choice when it %s', (_, event) => {
    render(app('en'));
    chooseInAnotherTab('ru');

    act(event);

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('asks once: the refreshed page brings the language, and then the cookie agrees', () => {
    chooseInAnotherTab('ru');
    const { rerender } = render(app('en'));

    rerender(app('ru'));
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
