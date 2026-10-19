// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fly } from '@/hooks/useStakeFlights';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';
import { demoStage } from '@/lib/demoDuel';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { DEMO_DWELL_MS, useDemoDuel } = await import('@/hooks/useDemoDuel');

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

    expect(fly).toHaveBeenCalledWith('creator', 'in', 0);
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
    expect(fly).toHaveBeenLastCalledWith('opponent', 'in', 120);
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
      ['creator', 'out', 0, 'creator'],
      ['opponent', 'out', 140, 'creator'],
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

    expect(fly.mock.calls.map(([side, , , home]) => [side, home])).toEqual([
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

    await wait(4 * (DEMO_DWELL_MS + 2000));

    expect(result.current).toMatchObject({ step: 5, outcome: 'confirm', isPlaying: false, isInviting: true });
    expect(result.current.stage).toEqual(demoStage(5, 'confirm'));
  });

  it('pauses on a second press and stays on its step', async () => {
    const { result } = renderDemo();
    act(() => result.current.toggle());
    await wait(1000);

    act(() => result.current.toggle());
    await wait(3 * DEMO_DWELL_MS);

    expect(result.current).toMatchObject({ step: 1, isPlaying: false, timing: null });
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

  describe('playing by itself', () => {
    function show(root: { current: HTMLElement }, isSeen: boolean) {
      act(() => FakeIntersectionObserver.watching(root.current).report(root.current, isSeen));
    }

    it('plays once it is mostly on screen', async () => {
      const { result, root } = renderDemo();

      show(root, true);
      await wait(700);

      expect(FakeIntersectionObserver.watching(root.current).thresholds).toEqual([0.55]);
      expect(result.current.isPlaying).toBe(true);
    });

    it('holds while scrolled away and goes on once back', async () => {
      const { result, root } = renderDemo();
      show(root, true);
      await wait(1000);

      show(root, false);
      expect(result.current.isPlaying).toBe(false);
      show(root, true);

      expect(result.current.isPlaying).toBe(true);
    });

    it('waits until it is seen when scrolled away before it starts', async () => {
      const { result, root } = renderDemo();
      show(root, true);
      show(root, false);
      await wait(700);
      expect(result.current.isPlaying).toBe(false);

      show(root, true);

      expect(result.current.isPlaying).toBe(true);
    });

    it('leaves the demo alone once the visitor has taken it', async () => {
      const { result, root } = renderDemo();
      act(() => result.current.pickStep(2));

      show(root, true);
      await wait(700);

      expect(result.current.isPlaying).toBe(false);
    });

    it('does not play by itself when the reader asked for less motion', () => {
      motion.reduced = true;
      renderDemo();

      expect(FakeIntersectionObserver.instances).toEqual([]);
    });
  });
});
