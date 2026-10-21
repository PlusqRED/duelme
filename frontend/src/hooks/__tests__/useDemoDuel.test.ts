// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fly } from '@/hooks/useStakeFlights';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';
import { demoStage } from '@/lib/demoDuel';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { DEMO_STEP_MS, useDemoDuel } = await import('@/hooks/useDemoDuel');

/** A flight that lands when the test says so. */
function heldFlights() {
  const landings: Array<() => void> = [];
  const fly = vi.fn<Fly>(
    () =>
      new Promise<boolean>((resolve) => {
        landings.push(() => resolve(true));
      })
  );
  const landAll = () => act(async () => landings.splice(0).forEach((land) => land()));
  return { fly, landAll };
}

function renderDemo(fly: Fly = vi.fn<Fly>(async () => true)) {
  const root = { current: document.createElement('section') };
  const cancelFlights = vi.fn();
  const hook = renderHook(() => useDemoDuel({ root, fly, cancelFlights }));
  return { ...hook, root, cancelFlights };
}

function wait(ms: number) {
  return act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  motion.reduced = false;
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useDemoDuel', () => {
  it('starts before anything happens, standing still', () => {
    const { result } = renderDemo();

    expect(result.current).toMatchObject({ step: 0, outcome: null, isPlaying: false, timing: null, jump: 0 });
    expect(result.current.stage).toEqual(demoStage(0, null));
  });

  it('shows a picked step at once with motion reduced', async () => {
    motion.reduced = true;
    const fly = vi.fn<Fly>(async () => true);
    const { result } = renderDemo(fly);

    act(() => result.current.pickStep(3));
    await wait(0);

    expect(result.current.step).toBe(3);
    expect(result.current.stage).toEqual(demoStage(3, null));
    expect(fly).not.toHaveBeenCalled();
  });

  it('shows the step before a jump at once, so only the last move plays', async () => {
    const { result } = renderDemo();

    act(() => result.current.pickStep(3));

    expect(result.current.jump).toBe(1);
    expect(result.current.stage.isJoined).toBe(true);
    await wait(1000);
    expect(result.current.stage).toEqual(demoStage(3, null));
  });

  it('takes the stake out of the wallet as it flies, and fills its slot once it lands', async () => {
    const { fly, landAll } = heldFlights();
    const { result } = renderDemo(fly);

    act(() => result.current.pickStep(1));
    await wait(0);

    expect(fly).toHaveBeenCalledWith('creator', 'in', { delay: 0 });
    expect(result.current.stage.wallets.creator).toBe(40_000_000n);
    expect(result.current.stage.staked.creator).toBe(false);
    await landAll();
    expect(result.current.stage).toEqual(demoStage(1, null));
  });

  it('lets the opponent take the seat before their stake moves', async () => {
    const { fly, landAll } = heldFlights();
    const { result } = renderDemo(fly);
    act(() => result.current.pickStep(1));
    await wait(0);
    await landAll();

    act(() => result.current.pickStep(2));

    expect(result.current.stage.isJoined).toBe(true);
    expect(result.current.stage.wallets.opponent).toBe(50_000_000n);
    expect(fly).toHaveBeenCalledTimes(1);
    await wait(700);
    expect(fly).toHaveBeenLastCalledWith('opponent', 'in', { delay: 120 });
  });

  it('unlocks the safe before the payout, then sends both stakes to the winner', async () => {
    const { fly, landAll } = heldFlights();
    const { result } = renderDemo(fly);
    act(() => result.current.pickStep(4));
    await wait(1000);

    act(() => result.current.pickOutcome('confirm'));
    await wait(700);

    expect(result.current.stage.isLocked).toBe(false);
    expect(fly).not.toHaveBeenCalled();
    await wait(420);
    expect(fly.mock.calls).toEqual([
      ['creator', 'out', { delay: 0, home: 'creator' }],
      ['opponent', 'out', { delay: 140, home: 'creator' }],
    ]);
    await landAll();
    expect(result.current.stage).toEqual(demoStage(5, 'confirm'));
  });

  it('sends each stake back to its own wallet after a dispute', async () => {
    const fly = vi.fn<Fly>(async () => true);
    const { result } = renderDemo(fly);
    act(() => result.current.pickStep(4));
    await wait(1000);

    act(() => result.current.pickOutcome('dispute'));
    await wait(2000);

    expect(fly.mock.calls.map(([side, , { home }]) => [side, home])).toEqual([
      ['creator', 'creator'],
      ['opponent', 'opponent'],
    ]);
    expect(result.current.stage).toEqual(demoStage(5, 'dispute'));
  });

  it('drops a move that another one interrupted', async () => {
    const { fly, landAll } = heldFlights();
    const { result, cancelFlights } = renderDemo(fly);
    act(() => result.current.pickStep(1));
    await wait(0);

    act(() => result.current.pickStep(3));
    await landAll();
    await wait(1000);

    expect(cancelFlights).toHaveBeenCalledTimes(2);
    expect(result.current.stage).toEqual(demoStage(3, null));
  });

  it('plays every step in turn, waiting on each, and ends on a confirmed duel inviting another ending', async () => {
    const { result } = renderDemo();

    act(() => result.current.toggle());
    await wait(1000);
    expect(result.current).toMatchObject({ step: 1, isPlaying: true, timing: 1 });

    await wait(5 * DEMO_STEP_MS);

    expect(result.current).toMatchObject({ step: 5, outcome: 'confirm', isPlaying: false, isInviting: true });
    expect(result.current.stage).toEqual(demoStage(5, 'confirm'));
  });

  it('times a played step from when it shows, its bar filling while its money is still in the air', async () => {
    const { fly } = heldFlights();
    const { result } = renderDemo(fly);

    act(() => result.current.toggle());
    await wait(0);

    expect(result.current).toMatchObject({ step: 1, timing: 1 });
  });

  it('moves on once a step has shown for its time, however long its moves took', async () => {
    const { fly, landAll } = heldFlights();
    const { result } = renderDemo(fly);
    act(() => result.current.toggle());
    await wait(1500);
    await landAll();

    await wait(DEMO_STEP_MS - 1700);
    const before = result.current.step;
    await wait(400);

    expect([before, result.current.step]).toEqual([1, 2]);
  });

  it('waits out a step whose moves outlast its time before moving on', async () => {
    const { fly, landAll } = heldFlights();
    const { result } = renderDemo(fly);
    act(() => result.current.toggle());

    await wait(DEMO_STEP_MS + 1000);
    const held = result.current.step;
    await landAll();
    await wait(0);

    expect([held, result.current.step]).toEqual([1, 2]);
  });

  it('plays no further once the demo is gone, even with a move still in the air', async () => {
    const { fly, landAll } = heldFlights();
    const { result, unmount } = renderDemo(fly);
    act(() => result.current.toggle());
    await wait(1000);
    const flown = fly.mock.calls.length;

    unmount();
    await landAll();
    await wait(5 * DEMO_STEP_MS);

    expect(fly.mock.calls.length).toBe(flown);
  });

  it('pauses on a second press and stays on its step', async () => {
    const { result } = renderDemo();
    act(() => result.current.toggle());
    await wait(1000);

    act(() => result.current.toggle());
    await wait(3 * DEMO_STEP_MS);

    expect(result.current).toMatchObject({ step: 1, isPlaying: false, timing: 1 });
  });

  it('goes on with the paused step for the rest of its time, rather than skipping to the next', async () => {
    const { result } = renderDemo();
    act(() => result.current.toggle());
    await wait(1000);
    act(() => result.current.toggle());
    await wait(10_000);

    act(() => result.current.toggle());
    await wait(DEMO_STEP_MS - 1200);
    const before = result.current.step;
    await wait(400);

    expect([before, result.current.step]).toEqual([1, 2]);
  });

  it('goes on with an ending paused before its time ran out rather than starting over', async () => {
    const { result } = renderDemo();
    act(() => result.current.toggle());
    await wait(4 * DEMO_STEP_MS + 1000);
    act(() => result.current.toggle());

    act(() => result.current.toggle());
    await wait(DEMO_STEP_MS);

    expect(result.current).toMatchObject({ step: 5, isPlaying: false, isInviting: true, timing: null });
  });

  it('gives the visitor the demo once they pick an ending', async () => {
    const { result } = renderDemo();
    act(() => result.current.toggle());
    await wait(1000);

    act(() => result.current.pickOutcome('timeout'));
    await wait(3000);

    expect(result.current).toMatchObject({ step: 5, outcome: 'timeout', isPlaying: false, isInviting: false });
    expect(result.current.stage).toEqual(demoStage(5, 'timeout'));
  });

  it('starts again from the beginning when played after the end', async () => {
    motion.reduced = true;
    const { result } = renderDemo();
    act(() => result.current.pickOutcome('dispute'));
    await wait(0);

    act(() => result.current.toggle());
    await wait(0);

    expect(result.current).toMatchObject({ step: 1, outcome: null, isPlaying: true });
  });
});
