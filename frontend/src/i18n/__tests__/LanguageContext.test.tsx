// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { LANGUAGE_COOKIE, readLanguageCookie } from '@/i18n/language';
import { translations, type Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

// One router for the whole app, as Next gives it.
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
const refresh = router.refresh;
const saveLanguage = vi.hoisted(() => vi.fn<(language: string) => Promise<void>>());

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));
vi.mock('@/i18n/saveLanguage', () => ({ saveLanguage }));

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

function chooseInAnotherTab(language: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/`;
}

/** A server that takes its time, so the page waits on it. */
function holdTheServer() {
  saveLanguage.mockImplementation(() => new Promise(() => {}));
}

beforeEach(() => {
  // A date in the past: happy-dom keeps a cookie with `max-age=0` until its clock ticks over.
  document.cookie = `${LANGUAGE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  saveLanguage.mockResolvedValue(undefined);
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

afterEach(() => {
  cleanup();
  refresh.mockClear();
  saveLanguage.mockReset();
  FakeChannel.open = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function LanguageProbe() {
  const { t, setLanguage } = useTranslation();
  const [kept, setKept] = useState<boolean | null>(null);
  return (
    <>
      <p>{t('footer.rights')}</p>
      <output>{String(kept)}</output>
      <button onClick={() => setKept(setLanguage('ru'))}>ru</button>
      <button onClick={() => setKept(setLanguage('en'))}>en</button>
    </>
  );
}

function renderIn(language: Language) {
  return render(
    <LanguageProvider language={language}>
      <LanguageProbe />
    </LanguageProvider>
  );
}

function rerenderIn(rerender: (ui: React.ReactNode) => void, language: Language) {
  rerender(
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

  it('keeps a new choice in the cookie and asks the server for the page in it', () => {
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(cookieLanguage()).toBe('ru');
    expect(saveLanguage).toHaveBeenCalledWith('ru');
    expect(screen.getByRole('status').textContent).toBe('true');
  });

  it('shows the new language at once, while the server works on the page', () => {
    holdTheServer();
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });

  it('asks nothing of the server for the language already shown', () => {
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(saveLanguage).not.toHaveBeenCalled();
  });

  it('asks once for a language already on its way', () => {
    holdTheServer();
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));
    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(saveLanguage).toHaveBeenCalledTimes(1);
  });

  it('keeps a quick switch back made before the first page arrived', () => {
    holdTheServer();
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));
    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(cookieLanguage()).toBe('en');
    expect(saveLanguage.mock.calls).toEqual([['ru'], ['en']]);
  });

  it('switches back to the language it started in once the refreshed page brought another', () => {
    const { rerender } = renderIn('en');
    rerenderIn(rerender, 'ru');

    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(saveLanguage).toHaveBeenCalledWith('en');
  });

  it('reloads the page when the server no longer has the action, after a deploy', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    saveLanguage.mockRejectedValue(new Error('Server Action was not found on the server'));
    renderIn('en');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'ru' })));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('changes nothing and says so when the browser keeps no cookies', () => {
    renderIn('en');
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(screen.getByRole('status').textContent).toBe('false');
    expect(saveLanguage).not.toHaveBeenCalled();
  });

  it('tells the site’s other tabs about a new choice', () => {
    renderIn('en');

    fireEvent.click(screen.getByRole('button', { name: 'ru' }));

    expect(FakeChannel.open[0].sent).toEqual(['ru']);
  });

  it('fetches its page again in the language another tab chose', () => {
    renderIn('en');
    chooseInAnotherTab('ru');

    act(() => FakeChannel.open[0].onmessage?.(new MessageEvent('message', { data: 'ru' })));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('fetches nothing when another tab chose the language already shown', () => {
    renderIn('ru');
    chooseInAnotherTab('ru');

    act(() => FakeChannel.open[0].onmessage?.(new MessageEvent('message', { data: 'ru' })));

    expect(refresh).not.toHaveBeenCalled();
  });

  it('follows a choice made in another tab while this one was still loading', () => {
    chooseInAnotherTab('ru');

    renderIn('en');

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['comes back into view', () => document.dispatchEvent(new Event('visibilitychange'))],
    ['comes back from the back/forward cache', () => window.dispatchEvent(new Event('pageshow'))],
  ])('checks the choice again when the tab %s', (_, event) => {
    renderIn('en');
    chooseInAnotherTab('ru');

    act(event);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('follows the language the refreshed page brings', () => {
    const { rerender } = renderIn('en');

    rerenderIn(rerender, 'ru');

    expect(screen.getByText(translations.ru['footer.rights'])).toBeTruthy();
  });
});
