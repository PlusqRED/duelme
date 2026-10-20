// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fly } from '@/hooks/useStakeFlights';
import { arenaView, type ArenaView } from '@/lib/arenaView';
import { DuelState, type Duel } from '@/lib/contracts';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const motion = vi.hoisted(() => ({ isReduced: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.isReduced }));

const { useArenaMotion } = await import('@/hooks/useArenaMotion');

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
const STAKE = 5_000_000n;

function joined(overrides: Partial<Duel> = {}): Duel {
  return duelView({ opponent: OPPONENT, fundedAt: 2n, state: DuelState.Funded, ...overrides });
}

const created = arenaView(duelView(), 'created');
const funded = arenaView(joined(), 'funded');
const won = joined({ claimedBy: CREATOR, claimedWinner: CREATOR, creatorPayout: STAKE * 2n, state: DuelState.Resolved });
const forWinner = arenaView(won, 'resolved');
const paid = arenaView({ ...won, creatorClaimed: true }, 'resolved');

const fly = vi.fn<Fly>(async () => true);
const cancel = vi.fn();

function play(start: ArenaView) {
  return renderHook(({ target }) => useArenaMotion(target, fly, cancel), { initialProps: { target: start } });
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  motion.isReduced = false;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  fly.mockClear();
  cancel.mockClear();
});

describe('useArenaMotion', () => {
  it('drops the stakes into the safe once as the page opens', async () => {
    const { result } = play(funded);
    expect(result.current.shown.staked).toEqual({ creator: false, opponent: false });

    await settle();

    expect(fly.mock.calls.map(([side, direction, options]) => [side, direction, options.delay])).toEqual([
      ['creator', 'in', 0],
      ['opponent', 'in', 140],
    ]);
    expect(result.current.shown).toEqual(funded);
  });

  it('shows the duel at once with motion reduced', () => {
    motion.isReduced = true;

    const { result } = play(funded);

    expect(result.current.shown).toEqual(funded);
    expect(fly).not.toHaveBeenCalled();
  });

  it('replays nothing when a poll brings the same duel back', async () => {
    const { rerender } = play(funded);
    await settle();
    fly.mockClear();
    cancel.mockClear();

    rerender({ target: arenaView(joined(), 'funded') });
    await settle();

    expect(fly).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('lets the opponent sit down before their stake flies in', async () => {
    const { result, rerender } = play(created);
    await settle();
    fly.mockClear();

    rerender({ target: funded });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.shown.isJoined).toBe(true);
    expect(result.current.shown.staked.opponent).toBe(false);
    expect(fly).not.toHaveBeenCalled();

    await settle();

    expect(fly).toHaveBeenCalledWith('opponent', 'in', expect.objectContaining({ delay: 140 }));
    expect(result.current.shown).toEqual(funded);
  });

  it('pays the pot out to the winner in the sun, and shows what they got', async () => {
    const { result, rerender } = play(forWinner);
    await settle();
    fly.mockClear();

    rerender({ target: paid });
    await settle();

    expect(fly.mock.calls.map(([side, direction, options]) => [side, direction, options.home, options.isPrize])).toEqual([
      ['creator', 'out', 'creator', true],
      ['opponent', 'out', 'creator', true],
    ]);
    expect(result.current.gains.creator).toEqual({ raw: STAKE * 2n, id: 1 });
    expect(result.current.gains.opponent).toBeUndefined();
    expect(result.current.shown).toEqual(paid);
  });

  it('gives the safe a moment to open before the money leaves it', async () => {
    const { result, rerender } = play(forWinner);
    await settle();
    fly.mockClear();

    rerender({ target: paid });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.shown.staked).toEqual(forWinner.staked);
    expect(fly).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    expect(fly).toHaveBeenCalledTimes(2);
  });

  it('drops the flights in the air when a newer change comes', async () => {
    const { rerender } = play(created);
    await settle();
    cancel.mockClear();

    rerender({ target: funded });

    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
