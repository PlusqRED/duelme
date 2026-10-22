// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';

const tracker = vi.hoisted(() => ({ siteId: 'abc123' as string | null }));
vi.mock('@/lib/analytics', () => ({
  get ANALYTICS_SITE_ID() {
    return tracker.siteId;
  },
  forgetPlayer: vi.fn(),
  stopReplay: vi.fn(),
  trackEvent: vi.fn(),
}));

const { AnalyticsChoice } = await import('@/components/analytics/AnalyticsChoice');

const en = translations.en;

function pressed(name: string) {
  return screen.getByRole('button', { name }).getAttribute('aria-pressed');
}

beforeEach(() => {
  tracker.siteId = 'abc123';
  window.localStorage.clear();
});

afterEach(cleanup);

describe('AnalyticsChoice', () => {
  it('says there is no answer yet, with neither pressed', () => {
    render(<AnalyticsChoice />);

    expect(screen.getByText(en['analytics.choice.unset'])).toBeTruthy();
    expect(pressed(en['analytics.banner.allow'])).toBe('false');
    expect(pressed(en['analytics.banner.deny'])).toBe('false');
  });

  it('changes the answer and says what it now means', () => {
    render(<AnalyticsChoice />);

    fireEvent.click(screen.getByRole('button', { name: en['analytics.banner.allow'] }));
    expect(screen.getByText(en['analytics.choice.granted'])).toBeTruthy();
    expect(pressed(en['analytics.banner.allow'])).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: en['analytics.banner.deny'] }));
    expect(screen.getByText(en['analytics.choice.denied'])).toBeTruthy();
    expect(pressed(en['analytics.banner.deny'])).toBe('true');
  });

  it('says a build without analytics has none, and offers no choice', () => {
    tracker.siteId = null;

    render(<AnalyticsChoice />);

    expect(screen.getByText(en['analytics.choice.off'])).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
