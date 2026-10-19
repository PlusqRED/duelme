// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useReputationSample } from '@/hooks/useReputationSample';

afterEach(cleanup);

describe('useReputationSample', () => {
  it('starts as a new player with nothing to show', () => {
    const { result } = renderHook(() => useReputationSample());

    expect([result.current.honored, result.current.abandoned, result.current.point.level]).toEqual([0, 0, 'new']);
    expect(result.current.change).toBeNull();
  });

  it('counts a duel seen through, and says the player went up', () => {
    const { result } = renderHook(() => useReputationSample());

    act(() => result.current.add('honored'));

    expect([result.current.honored, result.current.point.level]).toEqual([1, 'fair']);
    expect(result.current.change).toEqual({ id: 1, mark: 'honored', level: 'up' });
  });

  it('says a duel walked away from took the player down a level', () => {
    const { result } = renderHook(() => useReputationSample());
    act(() => result.current.add('honored'));

    act(() => result.current.add('abandoned'));

    expect(result.current.point.level).toBe('unreliable');
    expect(result.current.change).toEqual({ id: 2, mark: 'abandoned', level: 'down' });
  });

  it('says nothing of the level when it stays', () => {
    const { result } = renderHook(() => useReputationSample());
    act(() => result.current.add('honored'));

    act(() => result.current.add('honored'));

    expect(result.current.change?.level).toBeNull();
  });

  it('stops counting at 99', () => {
    const { result } = renderHook(() => useReputationSample());

    for (let duel = 0; duel < 101; duel++) {
      act(() => result.current.add('abandoned'));
    }

    expect(result.current.abandoned).toBe(99);
  });

  it('starts over from a new player', () => {
    const { result } = renderHook(() => useReputationSample());
    act(() => result.current.add('honored'));

    act(() => result.current.reset());

    expect([result.current.honored, result.current.abandoned, result.current.point.level]).toEqual([0, 0, 'new']);
    expect(result.current.change).toEqual({ id: 2, mark: 'reset', level: 'down' });
  });
});
