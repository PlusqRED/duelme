// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const screen = { matches: new Set<string>(), listeners: new Set<() => void>() };

function setMatching(...queries: string[]) {
  screen.matches = new Set(queries);
  screen.listeners.forEach((listener) => listener());
}

beforeEach(() => {
  screen.matches = new Set();
  screen.listeners.clear();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return screen.matches.has(query);
    },
    addEventListener: (_: string, listener: () => void) => screen.listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => screen.listeners.delete(listener),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('says whether the query matches now', () => {
    setMatching('(width < 35rem)');
    const { result } = renderHook(() => useMediaQuery('(width < 35rem)'));

    expect(result.current).toBe(true);
  });

  it('follows the screen when it changes', () => {
    const { result } = renderHook(() => useMediaQuery('(width < 35rem)'));
    expect(result.current).toBe(false);

    act(() => setMatching('(width < 35rem)'));

    expect(result.current).toBe(true);
  });

  it('stops listening once it is gone', () => {
    const { unmount } = renderHook(() => useMediaQuery('(width < 35rem)'));

    unmount();

    expect(screen.listeners.size).toBe(0);
  });
});

describe('useReducedMotion', () => {
  it('is the reader asking for less motion', () => {
    setMatching('(prefers-reduced-motion: reduce)');
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });
});
