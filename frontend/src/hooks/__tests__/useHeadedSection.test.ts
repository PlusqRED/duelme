// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => page.pathname }));

const { useHeadedSection } = await import('@/hooks/useHeadedSection');

/** A scroll event, the page moved by `by` pixels first. */
function scroll(by = 40) {
  act(() => {
    window.scrollTo(0, window.scrollY + by);
    window.dispatchEvent(new Event('scroll'));
  });
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  page.pathname = '/';
  window.scrollTo(0, 0);
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useHeadedSection', () => {
  it('testHeadedSectionIsNoneUntilALinkIsFollowed', () => {
    const { result } = renderHook(() => useHeadedSection());

    expect(result.current.headed).toBeNull();
  });

  it('testHeadedSectionHoldsWhileThePageGlides', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));

    for (let frame = 0; frame < 20; frame++) {
      scroll();
      wait(50);
    }

    expect(result.current.headed).toBe('demo');
  });

  it('testHeadedSectionStaysOnceThePageHasArrived', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('safety'));
    scroll();

    wait(5000);

    expect(result.current.headed).toBe('safety');
  });

  it('testHeadedSectionLetsGoAtTheReadersScrollAfterArriving', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    scroll();
    wait(200);

    scroll();

    expect(result.current.headed).toBeNull();
  });

  it('testHeadedSectionLetsGoAtAScrollBackUpAfterArriving', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    scroll();
    wait(200);

    scroll(-40);

    expect(result.current.headed).toBeNull();
  });

  it('testHeadedSectionHoldsThroughAScrollEventThatLeavesThePageWhereItStopped', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('safety'));
    scroll();
    wait(200);

    scroll(0);

    expect(result.current.headed).toBe('safety');
  });

  it('testHeadedSectionWaitsForAGlideThatStartsLate', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    wait(300);
    scroll();
    wait(100);

    scroll();

    expect(result.current.headed).toBe('demo');
  });

  it('testHeadedSectionHoldsAgainWhenTheSameLinkIsFollowedAgain', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('safety'));
    scroll();
    wait(200);

    act(() => result.current.headTo('safety'));
    scroll();

    expect(result.current.headed).toBe('safety');
  });

  it('testHeadedSectionLetsGoOnceThePageIsLeft', () => {
    const { result, rerender } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));

    page.pathname = '/games';
    rerender();
    page.pathname = '/';
    rerender();

    expect(result.current.headed).toBeNull();
  });

  it('testHeadedSectionLetsGoOnAPageThatWasAlreadyThere', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    wait(500);

    scroll();

    expect(result.current.headed).toBeNull();
  });
});
