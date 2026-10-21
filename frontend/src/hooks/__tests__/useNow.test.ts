// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClockValue, useNow } from '@/hooks/useNow';

const START = 1_800_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START * 1000 + 250);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useNow', () => {
  it('reads the time in whole seconds', () => {
    const { result } = renderHook(() => useNow());

    expect(result.current).toBe(START);
  });

  it('ticks once a second', () => {
    const { result } = renderHook(() => useNow());

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current).toBe(START + 1);
  });

  it('keeps one clock for every reader', () => {
    const first = renderHook(() => useNow());
    const second = renderHook(() => useNow());

    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(first.result.current).toBe(second.result.current);
  });

  it('stops the clock once nobody reads it', () => {
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useClockValue', () => {
  it('reads its value off the clock', () => {
    const { result } = renderHook(() => useClockValue((now) => now - START));

    expect(result.current).toBe(0);
  });

  it('re-renders only when the value changes, not every second', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useClockValue((now) => now >= START + 3);
    });
    const before = renders;

    act(() => vi.advanceTimersByTime(2000));
    expect(renders).toBe(before);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(true);
    expect(renders).toBe(before + 1);
  });
});
