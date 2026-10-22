// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_KEY, chooseAnalytics, saveConsent } from '@/lib/analyticsConsent';
import { translations } from '@/i18n/translations';

const tracker = vi.hoisted(() => ({
  siteId: 'abc123' as string | null,
  flushAnalytics: vi.fn(),
  startReplay: vi.fn(),
  stopReplay: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  get ANALYTICS_SITE_ID() {
    return tracker.siteId;
  },
  TRACKER_PATH: '/t',
  flushAnalytics: tracker.flushAnalytics,
  startReplay: tracker.startReplay,
  stopReplay: tracker.stopReplay,
  trackEvent: tracker.trackEvent,
}));
vi.mock('@/hooks/useAnalyticsIdentity', () => ({ useAnalyticsIdentity: vi.fn() }));
// The tag as next/script would be asked to add it.
vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="tracker" data-src={String(props.src)} data-sample={String(props['data-replay-sample-rate'])} />
  ),
}));

const { Analytics } = await import('@/components/analytics/Analytics');

const en = translations.en;

function answer(choice: 'granted' | 'denied') {
  saveConsent(window.localStorage, choice);
}

function banner() {
  return screen.queryByRole('region', { name: en['analytics.banner.label'] });
}

beforeEach(() => {
  tracker.siteId = 'abc123';
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('Analytics', () => {
  it('loads the tracker from the site itself and asks a visitor who has not answered', () => {
    render(<Analytics />);

    expect(screen.getByTestId('tracker').dataset.src).toBe('/t/script.js');
    expect(banner()).toBeTruthy();
  });

  it('holds the recording back until there is a yes', () => {
    render(<Analytics />);

    expect(screen.getByTestId('tracker').dataset.sample).toBe('0');
    expect(tracker.startReplay).not.toHaveBeenCalled();
  });

  it('records a visitor who said yes before from the page’s load, without asking again', () => {
    answer('granted');

    render(<Analytics />);

    expect(tracker.startReplay).toHaveBeenCalledTimes(1);
    expect(banner()).toBeNull();
    // Rybbit's own recording stays held: it could not be stopped while it loads.
    expect(screen.getByTestId('tracker').dataset.sample).toBe('0');
  });

  it('starts the recording on this page at a yes, and hides the question', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByRole('button', { name: en['analytics.banner.allow'] }));

    expect(tracker.startReplay).toHaveBeenCalledTimes(1);
    expect(banner()).toBeNull();
  });

  it('keeps counting anonymously after Anonymous only, and records nothing', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByRole('button', { name: en['analytics.banner.deny'] }));

    expect(tracker.startReplay).not.toHaveBeenCalled();
    expect(screen.getByTestId('tracker')).toBeTruthy();
    expect(banner()).toBeNull();
  });

  it('stops the recording when the yes is taken back', () => {
    answer('granted');
    render(<Analytics />);

    act(() => chooseAnalytics('denied'));

    expect(tracker.stopReplay).toHaveBeenCalledTimes(1);
  });

  it('follows an answer given in another tab', () => {
    render(<Analytics />);

    act(() => {
      answer('denied');
      window.dispatchEvent(new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY }));
    });

    expect(banner()).toBeNull();
  });

  it('is not there at all without a site id', () => {
    tracker.siteId = null;

    const { container } = render(<Analytics />);

    expect(container.innerHTML).toBe('');
  });
});
