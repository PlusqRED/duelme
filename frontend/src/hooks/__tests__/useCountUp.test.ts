// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({ isReduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.isReduced }));

const { useCountUp } = await import('@/hooks/useCountUp');

function renderCount(initial: bigint | null) {
  return renderHook(({ value }) => useCountUp(value), { initialProps: { value: initial } });
}

beforeEach(() => {
  motion.isReduced = false;
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useCountUp', () => {
  it('shows the first amount at once', () => {
    const { result } = renderCount(46_700_000n);

    expect(result.current).toBe(46_700_000n);
  });

  it('counts to a new amount in whole tenths, and ends on it exactly', () => {
    const { result, rerender } = renderCount(46_700_000n);
    rerender({ value: 146_700_123n });

    act(() => vi.advanceTimersByTime(300));
    const midway = result.current ?? 0n;
    expect(midway > 46_700_000n && midway < 146_700_123n).toBe(true);
    expect(midway % 100_000n).toBe(0n);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(146_700_123n);
  });

  it('counts down as well as up', () => {
    const { result, rerender } = renderCount(10_000_000n);
    rerender({ value: 4_000_000n });

    act(() => vi.advanceTimersByTime(300));
    expect((result.current ?? 0n) < 10_000_000n).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(4_000_000n);
  });

  it('shows a new amount at once when the reader asked for less motion', () => {
    motion.isReduced = true;
    const { result, rerender } = renderCount(46_700_000n);

    rerender({ value: 146_700_000n });

    expect(result.current).toBe(146_700_000n);
  });

  it('shows the amount at once when there was none before', () => {
    const { result, rerender } = renderCount(null);

    rerender({ value: 5_000_000n });

    expect(result.current).toBe(5_000_000n);
  });
});
