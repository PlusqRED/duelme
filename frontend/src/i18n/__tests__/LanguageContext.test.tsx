// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { LANGUAGE_COOKIE, readLanguageCookie } from '@/i18n/language';
import { translations } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

// One router for the whole app, as Next gives it.
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
const refresh = router.refresh;
const toastError = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

/** The tabs of one browser: each provider opens a channel, and a message reaches every other one. */
class FakeChannel {
  static open: FakeChannel[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  sent: unknown[] = [];

  constructor() {
    FakeChannel.open.push(this);
  }

  postMessage(data: unknown) {
    this.sent.push(data);
  }

  close() {
    FakeChannel.open = FakeChannel.open.filter((channel) => channel !== this);
  }
}

function cookieLanguage() {
  return readLanguageCookie(document.cookie);
}

beforeEach(() => {
  document.cookie = `${LANGUAGE_COOKIE}=; path=/; max-age=0`;
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

afterEach(() => {
  cleanup();
  refresh.mockClear();
  toastError.mockClear();
  FakeChannel.open = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function LanguageProbe() {
  const { t, setLanguage } = useTranslation();
  return (
    <>
      <p>{t('footer.rights')}</p>
      <button onClick={() => setLanguage('ru')}>ru</button>
      <button onClick={() => setLanguage('en')}>en</button>
    </>
  );
}

function renderIn(language: 'en' | 'ru') {
  return render(
    <LanguageProvider language={language}>
      <LanguageProbe />
    </LanguageProvider>
  );
}

describe('LanguageProvider', () => {
  it('speaks the language the layout gives it', () => {
    renderIn('ru');

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });

  it('keeps a new choice in the cookie and asks the server for the page again', () => {
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(cookieLanguage()).toBe('ru');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('asks nothing of the server for the language already there', () => {
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(refresh).not.toHaveBeenCalled();
  });

  it('keeps a quick switch back made before the first page arrived', () => {
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));
    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(cookieLanguage()).toBe('en');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('writes the cookie again on each visit, so Safari does not drop it after a week', () => {
    renderIn('ru');

    expect(cookieLanguage()).toBe('ru');
  });

  it('says why the language cannot change when the browser keeps no cookies', () => {
    renderIn('en');
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(toastError).toHaveBeenCalledWith(translations.en['toast.languageNotKept']);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('tells the site’s other tabs about a new choice', () => {
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(FakeChannel.open[0].sent).toEqual(['ru']);
  });

  it('fetches its page again when another tab chose a language', () => {
    renderIn('en');

    act(() => FakeChannel.open[0].onmessage?.(new MessageEvent('message', { data: 'ru' })));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('follows the language the refreshed page brings', () => {
    const { rerender } = renderIn('en');

    rerender(
      <LanguageProvider language="ru">
        <LanguageProbe />
      </LanguageProvider>
    );

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });
});
