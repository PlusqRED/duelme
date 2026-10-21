// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => page.pathname }));

const { useHeadedSection } = await import('@/hooks/useHeadedSection');

/** How far down the page each section starts; its top on screen follows the page's scroll. */
const layout: Record<string, number> = {};

function addSection(id: string, at: number) {
  layout[id] = at;
  const section = document.createElement('section');
  section.id = id;
  section.getBoundingClientRect = () => new DOMRect(0, layout[id] - window.scrollY, 0, 0);
  document.body.append(section);
}

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

/** The page gliding to `to` a frame at a time, then standing still long enough to have arrived. */
function glideTo(to: number) {
  while (window.scrollY !== to) {
    scroll(Math.sign(to - window.scrollY) * Math.min(100, Math.abs(to - window.scrollY)));
    wait(16);
  }
  wait(200);
}

beforeEach(() => {
  page.pathname = '/';
  window.scrollTo(0, 0);
  document.body.replaceChildren();
  addSection('demo', 1000);
  addSection('safety', 3000);
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

    for (let frame = 0; frame < 10; frame++) {
      scroll(100);
      wait(50);
    }

    expect(result.current.headed).toBe('demo');
  });

  it('testHeadedSectionStaysOnceThePageHasArrived', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    glideTo(1000);

    wait(5000);

    expect(result.current.headed).toBe('demo');
  });

  it('testHeadedSectionLetsGoAtTheReadersScrollAfterArriving', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    glideTo(1000);

    scroll(40);

    expect(result.current.headed).toBeNull();
  });

  it('testHeadedSectionLetsGoAtAScrollBackUpAfterArriving', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    glideTo(1000);

    scroll(-40);

    expect(result.current.headed).toBeNull();
  });

  it('testHeadedSectionHoldsThroughTwoPixels', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    glideTo(1000);

    scroll(2);

    expect(result.current.headed).toBe('demo');
  });

  it('testHeadedSectionLetsGoAtThreePixels', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    glideTo(1000);

    scroll(3);

    expect(result.current.headed).toBeNull();
  });

  it('testHeadedSectionHoldsThroughAGlideThatStallsPastTheWait', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    scroll(400);
    wait(200);

    scroll(400);
    wait(50);
    scroll(200);

    expect(result.current.headed).toBe('demo');
  });

  it('testHeadedSectionHoldsThroughContentLoadingAboveTheSection', () => {
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    glideTo(1000);

    layout.demo += 300;
    scroll(300);

    expect(result.current.headed).toBe('demo');
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
    glideTo(3000);
    scroll(-500);

    act(() => result.current.headTo('safety'));
    scroll(100);

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
    window.scrollTo(0, 1000);
    const { result } = renderHook(() => useHeadedSection());
    act(() => result.current.headTo('demo'));
    wait(500);

    scroll();

    expect(result.current.headed).toBeNull();
  });
});
