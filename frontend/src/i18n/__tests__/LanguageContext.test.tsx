// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UnrecognizedActionError } from 'next/dist/client/components/unrecognized-action-error';
import { use, useEffect, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider, type LanguageSwitch } from '@/i18n/LanguageContext';
import { LANGUAGE_COOKIE, readLanguageCookie } from '@/i18n/language';
import { translations, type Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

// One router for the whole app, as Next gives it, on a page the test can move.
const router = vi.hoisted(() => ({ refresh: vi.fn(), pathname: '/games' }));
const refresh = router.refresh;
const saveLanguage = vi.hoisted(() => vi.fn<(language: string) => Promise<void>>());

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
  usePathname: () => router.pathname,
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

/**
 * The server's answers to `saveLanguage`, oldest first. Like Next's router, each one arrives as a
 * state update in the caller's transition, which waits for it.
 */
const answers: Array<PromiseWithResolvers<void>> = [];
let showPage: ((page: Promise<void>) => void) | null = null;

function RouterStandIn() {
  const [page, setPage] = useState<Promise<void> | null>(null);
  useEffect(() => {
    showPage = setPage;
  }, []);
  if (page) use(page);
  return null;
}

function answerLater() {
  saveLanguage.mockImplementation(() => {
    const pending = Promise.withResolvers<void>();
    answers.push(pending);
    showPage?.(pending.promise.catch(() => {}));
    return pending.promise;
  });
}

async function answer(index: number, outcome: 'ok' | Error = 'ok') {
  await act(async () => (outcome === 'ok' ? answers[index].resolve() : answers[index].reject(outcome)));
}

function cookieLanguage() {
  return readLanguageCookie(document.cookie);
}

function chooseInAnotherTab(language: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/`;
}

beforeEach(() => {
  // A date in the past: happy-dom keeps a cookie with `max-age=0` until its clock ticks over.
  document.cookie = `${LANGUAGE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  router.pathname = '/games';
  answerLater();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

afterEach(async () => {
  // Every answer arrives, so no transition is left waiting into the next test.
  await act(async () => answers.forEach((pending) => pending.resolve()));
  answers.length = 0;
  showPage = null;
  cleanup();
  refresh.mockClear();
  saveLanguage.mockReset();
  FakeChannel.open = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function LanguageProbe() {
  const { t, setLanguage } = useTranslation();
  const [result, setResult] = useState<LanguageSwitch | null>(null);
  const choose = (language: Language) => void setLanguage(language).then(setResult);
  return (
    <>
      <p>{t('footer.rights')}</p>
      <output>{String(result)}</output>
      <button onClick={() => choose('ru')}>ru</button>
      <button onClick={() => choose('en')}>en</button>
    </>
  );
}

function app(language: Language): ReactNode {
  return (
    <LanguageProvider language={language}>
      <RouterStandIn />
      <LanguageProbe />
    </LanguageProvider>
  );
}

function renderIn(language: Language) {
  return render(app(language));
}

async function click(name: Language) {
  await act(async () => fireEvent.click(screen.getByRole('button', { name })));
}

function shows(language: Language) {
  return screen.queryByText(translations[language]['footer.rights']) !== null;
}

describe('LanguageProvider', () => {
  it('speaks the language the layout gives it', () => {
    renderIn('ru');

    expect(shows('ru')).toBe(true);
  });

  it('keeps a new choice in the cookie and asks the server for the page in it', async () => {
    renderIn('en');

    await click('ru');
    await answer(0);

    expect(cookieLanguage()).toBe('ru');
    expect(saveLanguage).toHaveBeenCalledWith('ru');
    expect(screen.getByRole('status').textContent).toBe('saved');
  });

  it('shows the new language at once, while the server works on the page', async () => {
    renderIn('en');

    await click('ru');

    expect(shows('ru')).toBe(true);
  });

  it('asks nothing of the server for the language already shown and kept', async () => {
    chooseInAnotherTab('en');
    renderIn('en');

    await click('en');

    expect(saveLanguage).not.toHaveBeenCalled();
  });

  it('asks once for a language already on its way', async () => {
    renderIn('en');

    await click('ru');
    await click('ru');

    expect(saveLanguage).toHaveBeenCalledTimes(1);
  });

  it('keeps a quick switch back made before the first page arrived', async () => {
    renderIn('en');

    await click('ru');
    await click('en');

    expect(cookieLanguage()).toBe('en');
    expect(saveLanguage.mock.calls).toEqual([['ru'], ['en']]);
  });

  it('switches back to the language it started in once the refreshed page brought another', async () => {
    const { rerender } = renderIn('en');
    rerender(app('ru'));

    await click('en');

    expect(saveLanguage).toHaveBeenCalledWith('en');
  });

  it('puts the cookie right when it holds another language than the one shown', async () => {
    renderIn('en');
    chooseInAnotherTab('ru');

    await click('en');

    expect(cookieLanguage()).toBe('en');
    expect(saveLanguage).toHaveBeenCalledWith('en');
  });

  it('goes back to the old language, cookie and all, when the server cannot be reached', async () => {
    renderIn('en');

    await click('ru');
    await answer(0, new TypeError('Failed to fetch'));

    expect(screen.getByRole('status').textContent).toBe('failed');
    expect(shows('en')).toBe(true);
    expect(cookieLanguage()).toBe('en');
  });

  it('reloads the page when the server no longer has the action, after a deploy', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderIn('en');

    await click('ru');
    await answer(0, new UnrecognizedActionError('Server Action was not found on the server'));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('changes nothing and says so when the browser keeps no cookies', async () => {
    renderIn('en');
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});

    await click('ru');

    expect(screen.getByRole('status').textContent).toBe('blocked');
    expect(saveLanguage).not.toHaveBeenCalled();
  });

  it('tells the site’s other tabs about a new choice once the server kept it', async () => {
    renderIn('en');

    await click('ru');
    expect(FakeChannel.open[0].sent).toEqual([]);
    await answer(0);

    expect(FakeChannel.open[0].sent).toEqual(['ru']);
  });

  it('tells the other tabs only the latest choice, not one the reader already left', async () => {
    renderIn('en');

    await click('ru');
    await click('en');
    await answer(0);
    await answer(1);

    expect(FakeChannel.open[0].sent).toEqual(['en']);
  });

  it('fetches its page again in the language another tab chose, before its own cookie shows it', () => {
    renderIn('en');

    act(() => FakeChannel.open[0].onmessage?.(new MessageEvent('message', { data: 'ru' })));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('fetches nothing when another tab chose the language already shown', () => {
    renderIn('ru');

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

  it('checks the choice again on every new page, which a lost refresh needs', () => {
    const { rerender } = renderIn('en');
    chooseInAnotherTab('ru');

    router.pathname = '/duels/public';
    rerender(app('en'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('follows the language the refreshed page brings', () => {
    const { rerender } = renderIn('en');

    rerender(app('ru'));

    expect(shows('ru')).toBe(true);
  });
});
