// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { LanguageContext } from '@/i18n/LanguageContext';
import { translator } from '@/i18n/translate';
import { translations, type Language } from '@/i18n/translations';

const page = vi.hoisted(() => ({ pathname: '/duel/7', query: 'from=list' }));
const toastError = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => page.pathname,
  useSearchParams: () => new URLSearchParams(page.query),
}));
vi.mock('sonner', () => ({ toast: { error: toastError, info: vi.fn(), success: vi.fn() } }));

/** What the browser would post: the form's fields with the button pressed. */
let posted: Record<string, FormDataEntryValue> | null = null;

// happy-dom does not navigate: a submit that went through is caught here instead.
function catchSubmit(event: Event) {
  if (event.target instanceof HTMLFormElement && event instanceof SubmitEvent) {
    posted = Object.fromEntries(new FormData(event.target, event.submitter));
  }
  event.preventDefault();
}

function renderIn(language: Language) {
  render(
    <LanguageContext.Provider value={{ language, ...translator(language) }}>
      <LanguageToggle />
    </LanguageContext.Provider>
  );
}

function press(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => {
  posted = null;
  page.pathname = '/duel/7';
  page.query = 'from=list';
  window.history.replaceState(null, '', '/duel/7?from=list#0xabc');
  document.addEventListener('submit', catchSubmit);
});

afterEach(() => {
  document.removeEventListener('submit', catchSubmit);
  cleanup();
  toastError.mockClear();
  vi.unstubAllGlobals();
});

describe('LanguageToggle', () => {
  it('posts the language to the switch’s route', () => {
    renderIn('en');

    expect(screen.getByRole('button', { name: 'RU' }).closest('form')?.getAttribute('action')).toBe('/api/language');
  });

  it('sends the whole address back, with the hash a private duel keeps its invite secret in', () => {
    renderIn('en');

    press('RU');

    expect(posted).toEqual({ back: '/duel/7?from=list#0xabc', language: 'ru' });
  });

  it('carries the page and its query from the server, for a press before the page’s script runs', () => {
    renderIn('en');

    expect(document.querySelector<HTMLInputElement>('input[name="back"]')?.value).toBe('/duel/7?from=list');
  });

  it('marks the language shown and does nothing when it is pressed', () => {
    renderIn('ru');

    press('RU');

    expect(screen.getByRole('button', { name: 'RU' }).getAttribute('aria-pressed')).toBe('true');
    expect(posted).toBeNull();
  });

  it('says why nothing changes when the browser keeps no cookies', () => {
    vi.stubGlobal('navigator', { ...navigator, cookieEnabled: false });
    renderIn('en');

    press('RU');

    expect(posted).toBeNull();
    expect(toastError).toHaveBeenCalledWith(translations.en['toast.languageNotKept']);
  });
});
