// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

let target: HTMLElement;

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  target = document.createElement('ol');
  document.body.append(target);
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('useSeenOnce', () => {
  it('has not been seen before it comes on screen', () => {
    const { result } = renderHook(() => useSeenOnce({ current: target }, 0.6));

    expect(result.current).toBe(false);
  });

  it('waits until the share asked for is on screen', () => {
    renderHook(() => useSeenOnce({ current: target }, 0.6));

    expect(FakeIntersectionObserver.watching(target).thresholds).toEqual([0.6]);
  });

  it('has been seen once it comes on screen, and stops watching', () => {
    const { result } = renderHook(() => useSeenOnce({ current: target }, 0.6));

    act(() => FakeIntersectionObserver.watching(target).report(target, true));

    expect(result.current).toBe(true);
    expect(FakeIntersectionObserver.instances.every((observer) => observer.observed.size === 0)).toBe(true);
  });

  it('stays seen after it leaves the screen', () => {
    const { result } = renderHook(() => useSeenOnce({ current: target }, 0.6));
    const observer = FakeIntersectionObserver.watching(target);
    act(() => observer.report(target, true));

    act(() => observer.report(target, false));

    expect(result.current).toBe(true);
  });

  it('ignores a report that it is still off screen', () => {
    const { result } = renderHook(() => useSeenOnce({ current: target }, 0.6));

    act(() => FakeIntersectionObserver.watching(target).report(target, false));

    expect(result.current).toBe(false);
  });
});
