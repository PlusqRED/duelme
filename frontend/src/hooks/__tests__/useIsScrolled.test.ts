// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIsScrolled } from '@/hooks/useIsScrolled';

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
}

afterEach(() => {
  cleanup();
  scrollTo(0);
});

describe('useIsScrolled', () => {
  it('is not scrolled at the top of the page', () => {
    const { result } = renderHook(() => useIsScrolled());

    expect(result.current).toBe(false);
  });

  it('is scrolled once the page has moved past a few pixels', () => {
    const { result } = renderHook(() => useIsScrolled());

    act(() => scrollTo(40));

    expect(result.current).toBe(true);
  });

  it('ignores the first few pixels, so a nudge does not draw the edge', () => {
    const { result } = renderHook(() => useIsScrolled());

    act(() => scrollTo(3));

    expect(result.current).toBe(false);
  });

  it('is no longer scrolled back at the top', () => {
    const { result } = renderHook(() => useIsScrolled());
    act(() => scrollTo(40));

    act(() => scrollTo(0));

    expect(result.current).toBe(false);
  });
});
