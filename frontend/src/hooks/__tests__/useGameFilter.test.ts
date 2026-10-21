// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { LEAVE_MS, useGameFilter } = await import('@/hooks/useGameFilter');

beforeEach(() => {
  motion.reduced = false;
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useGameFilter', () => {
  it('starts on every game', () => {
    const { result } = renderHook(() => useGameFilter());

    expect([result.current.picked, result.current.shown]).toEqual([null, null]);
  });

  it('marks the pick at once and shows it once the rows that go have stepped out', () => {
    const { result } = renderHook(() => useGameFilter());

    act(() => result.current.pick('dota-2'));

    expect([result.current.picked, result.current.shown]).toEqual(['dota-2', null]);
    act(() => vi.advanceTimersByTime(LEAVE_MS));
    expect(result.current.shown).toBe('dota-2');
  });

  it('shows the pick at once with motion reduced', () => {
    motion.reduced = true;
    const { result } = renderHook(() => useGameFilter());

    act(() => result.current.pick('dota-2'));

    expect(result.current.shown).toBe('dota-2');
  });

  it('shows only the last of two quick picks', () => {
    const { result } = renderHook(() => useGameFilter());
    act(() => result.current.pick('dota-2'));
    act(() => vi.advanceTimersByTime(LEAVE_MS - 50));

    act(() => result.current.pick('chess'));
    act(() => vi.advanceTimersByTime(LEAVE_MS - 50));

    expect(result.current.shown).toBeNull();
    act(() => vi.advanceTimersByTime(50));
    expect(result.current.shown).toBe('chess');
  });

  it('says the rows are leaving until the pick is shown', () => {
    const { result } = renderHook(() => useGameFilter());

    act(() => result.current.pick('dota-2'));

    expect(result.current.isLeaving).toBe(true);
    act(() => vi.advanceTimersByTime(LEAVE_MS));
    expect(result.current.isLeaving).toBe(false);
  });

  it('shows every game again when the picked game is picked again, and says so', () => {
    const { result } = renderHook(() => useGameFilter());
    act(() => result.current.pick('dota-2'));
    act(() => vi.advanceTimersByTime(LEAVE_MS));
    let next: string | null = 'unset';

    act(() => {
      next = result.current.pick('dota-2');
    });
    act(() => vi.advanceTimersByTime(LEAVE_MS));

    expect([next, result.current.picked, result.current.shown, result.current.isLeaving]).toEqual([null, null, null, false]);
  });

  it('goes back to every game', () => {
    const { result } = renderHook(() => useGameFilter());
    act(() => result.current.pick('dota-2'));
    act(() => vi.advanceTimersByTime(LEAVE_MS));

    act(() => result.current.pick(null));
    act(() => vi.advanceTimersByTime(LEAVE_MS));

    expect([result.current.picked, result.current.shown]).toEqual([null, null]);
  });
});
