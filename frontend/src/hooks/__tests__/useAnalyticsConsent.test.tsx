// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { chooseAnalytics, saveConsent } from '@/lib/analyticsConsent';

vi.mock('@/lib/analytics', () => ({ forgetPlayer: vi.fn(), stopReplay: vi.fn(), trackEvent: vi.fn() }));

function Answer() {
  return <p data-testid="answer">{useAnalyticsConsent()}</p>;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('useAnalyticsConsent', () => {
  it('knows no answer on the server, whatever the browser keeps, so hydration matches', () => {
    saveConsent(window.localStorage, 'granted');

    expect(renderToString(<Answer />)).toContain('unknown');
  });

  it('reads the kept answer in the browser, and no answer as unset', () => {
    const { unmount } = render(<Answer />);
    expect(screen.getByTestId('answer').textContent).toBe('unset');
    unmount();

    saveConsent(window.localStorage, 'denied');
    render(<Answer />);

    expect(screen.getByTestId('answer').textContent).toBe('denied');
  });

  it('follows a new answer', () => {
    render(<Answer />);

    act(() => chooseAnalytics('granted'));

    expect(screen.getByTestId('answer').textContent).toBe('granted');
  });
});
