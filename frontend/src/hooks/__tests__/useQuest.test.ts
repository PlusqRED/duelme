// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QUEST_STEPS, useQuest } from '@/hooks/useQuest';

afterEach(cleanup);

describe('useQuest', () => {
  it('starts on the first step, not yet moved', () => {
    const { result } = renderHook(() => useQuest());

    expect([result.current.step, result.current.isDone, result.current.direction]).toEqual([1, false, 0]);
  });

  it('walks on one step at a time, and is done after the last', () => {
    const { result } = renderHook(() => useQuest());

    for (let step = 1; step <= QUEST_STEPS; step++) {
      act(() => result.current.next());
    }

    expect([result.current.step, result.current.isDone, result.current.reached]).toEqual([QUEST_STEPS, true, 5]);
  });

  it('stays done when told to go on again', () => {
    const { result } = renderHook(() => useQuest());
    act(() => result.current.goTo(QUEST_STEPS + 1));

    act(() => result.current.next());

    expect(result.current.reached).toBe(QUEST_STEPS + 1);
  });

  it('says a jump back went back, and a replay starts over', () => {
    const { result } = renderHook(() => useQuest());
    act(() => result.current.goTo(3));
    act(() => result.current.goTo(2));
    expect(result.current.direction).toBe(-1);

    act(() => result.current.goTo(QUEST_STEPS + 1));
    act(() => result.current.replay());

    expect([result.current.step, result.current.isDone, result.current.direction]).toEqual([1, false, -1]);
  });
});
