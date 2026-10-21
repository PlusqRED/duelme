// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHeadedSection } from '@/hooks/useHeadedSection';

function scroll() {
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
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

  it('testHeadedSectionLetsGoAtTheNextScrollAfterArriving', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    scroll();
    wait(200);

    scroll();

    expect(result.current.headed).toBeNull();
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

  it('testHeadedSectionLetsGoOnAPageThatWasAlreadyThere', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    wait(500);

    scroll();

    expect(result.current.headed).toBeNull();
  });
});
