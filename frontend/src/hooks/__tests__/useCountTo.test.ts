// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({ isReduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.isReduced }));

const { useCountTo } = await import('@/hooks/useCountTo');

function renderCount(isOn: boolean) {
  return renderHook(({ on }) => useCountTo(94.9, on, { durationMs: 1000, delayMs: 200 }), { initialProps: { on: isOn } });
}

beforeEach(() => {
  motion.isReduced = false;
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useCountTo', () => {
  it('shows zero until it is turned on', () => {
    const { result } = renderCount(false);

    act(() => vi.advanceTimersByTime(2000));

    expect(result.current).toBe(0);
  });

  it('waits out its delay, then counts up and ends on the figure', () => {
    const { result, rerender } = renderCount(false);
    rerender({ on: true });

    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe(0);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(94.9);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(94.9);
  });

  it('shows the figure at once with motion reduced', () => {
    motion.isReduced = true;

    const { result } = renderCount(true);

    expect(result.current).toBe(94.9);
  });
});
