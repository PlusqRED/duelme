// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => ({ events: [] as [string, unknown][] }));
vi.mock('@/lib/analytics', () => ({
  trackEvent: (name: string, props: unknown) => sent.events.push([name, props]),
  forgetPlayer: () => sent.events.push(['forget', null]),
  stopReplay: () => sent.events.push(['stop replay', null]),
}));

const {
  ANALYTICS_CONSENT_KEY,
  chooseAnalytics,
  currentConsent,
  parseConsent,
  readConsent,
  saveConsent,
  subscribeToConsent,
} = await import('@/lib/analyticsConsent');

function refusingStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  return {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('quota');
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  sent.events = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseConsent', () => {
  it('reads an answer it wrote', () => {
    expect(parseConsent(JSON.stringify({ choice: 'granted', at: '2026-10-22T00:00:00.000Z' }))).toBe('granted');
    expect(parseConsent(JSON.stringify({ choice: 'denied' }))).toBe('denied');
  });

  it('reads anything else as no answer', () => {
    for (const raw of [null, '', 'granted', '{', '[]', 'null', JSON.stringify({ choice: 'yes' }), JSON.stringify({})]) {
      expect(parseConsent(raw)).toBeNull();
    }
  });
});

describe('saveConsent and readConsent', () => {
  it('keep the answer with when it was given', () => {
    const now = new Date('2026-10-22T10:00:00.000Z');

    expect(saveConsent(window.localStorage, 'denied', now)).toBe(true);

    expect(readConsent(window.localStorage)).toBe('denied');
    expect(JSON.parse(window.localStorage.getItem(ANALYTICS_CONSENT_KEY) ?? 'null')).toEqual({
      choice: 'denied',
      at: '2026-10-22T10:00:00.000Z',
    });
  });

  it('say so when storage refuses, instead of throwing', () => {
    expect(saveConsent(refusingStorage(), 'granted')).toBe(false);
    expect(readConsent(refusingStorage())).toBeNull();
  });
});

describe('chooseAnalytics', () => {
  it('keeps the answer, counts it and tells every screen', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToConsent(onChange);

    chooseAnalytics('granted');
    unsubscribe();
    chooseAnalytics('denied');

    expect(currentConsent()).toBe('denied');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(sent.events).toEqual([
      ['analytics_choice', { choice: 'granted' }],
      ['forget', null],
      ['stop replay', null],
      ['analytics_choice', { choice: 'denied' }],
    ]);
  });

  it('holds an answer storage would not keep for the rest of the page', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    chooseAnalytics('denied');

    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull();
    expect(currentConsent()).toBe('denied');

    vi.restoreAllMocks();
    chooseAnalytics('granted');
    expect(currentConsent()).toBe('granted');
  });
});

describe('subscribeToConsent', () => {
  it('hears an answer given in another tab, and nothing else stored there', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToConsent(onChange);

    window.dispatchEvent(new StorageEvent('storage', { key: 'duelme:create-duel-draft:v1' }));
    window.dispatchEvent(new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY }));
    // A cleared storage names no key.
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY }));

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
