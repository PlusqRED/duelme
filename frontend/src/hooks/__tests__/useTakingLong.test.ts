// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAKING_LONG_MS, useTakingLong } from '@/hooks/useTakingLong';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderWait(isWaiting: boolean) {
  return renderHook((waiting: boolean) => useTakingLong(waiting), { initialProps: isWaiting });
}

describe('useTakingLong', () => {
  it('testUseTakingLongStaysQuietAtFirst', () => {
    const { result } = renderWait(true);

    act(() => vi.advanceTimersByTime(TAKING_LONG_MS - 1));

    expect(result.current).toBe(false);
  });

  it('testUseTakingLongSpeaksUpOnceTheWaitRunsLong', () => {
    const { result } = renderWait(true);

    act(() => vi.advanceTimersByTime(TAKING_LONG_MS));

    expect(result.current).toBe(true);
  });

  it('testUseTakingLongFallsQuietWhenTheWaitEnds', () => {
    const { result, rerender } = renderWait(true);
    act(() => vi.advanceTimersByTime(TAKING_LONG_MS));

    rerender(false);

    expect(result.current).toBe(false);
  });

  it('testUseTakingLongCountsANewWaitFromZero', () => {
    const { result, rerender } = renderWait(true);
    act(() => vi.advanceTimersByTime(TAKING_LONG_MS));
    rerender(false);

    rerender(true);

    expect(result.current).toBe(false);
  });

  it('testUseTakingLongNeverSpeaksWithoutAWait', () => {
    const { result } = renderWait(false);

    act(() => vi.advanceTimersByTime(TAKING_LONG_MS * 2));

    expect(result.current).toBe(false);
  });
});
