import { describe, expect, it } from 'vitest';
import { actorsFirst, arenaView, arrivalView, hasActed } from '@/lib/arenaView';
import { ZERO_ADDRESS } from '@/lib/constants';
import type { Duel } from '@/lib/contracts';
import type { DuelPhase } from '@/lib/duelPhase';
import { duelView } from './helpers/duelView';

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
const STAKE = 5_000_000n;

function joined(overrides: Partial<Duel> = {}): Duel {
  return duelView({ creator: CREATOR, opponent: OPPONENT, ...overrides });
}

/** A win `winner` reported, against the other player. */
function claimedBy(winner: `0x${string}`, overrides: Partial<Duel> = {}): Duel {
  return joined({ claimedBy: winner, claimedWinner: winner, ...overrides });
}

describe('arenaView before the duel is settled', () => {
  it('shows the creator’s stake alone and an open seat while the duel waits', () => {
    const view = arenaView(duelView(), 'created');

    expect(view).toMatchObject({
      isJoined: false,
      staked: { creator: true, opponent: false },
      totalRaw: STAKE,
      isLocked: false,
      vault: 'waiting',
      match: null,
      showsLevels: true,
    });
  });

  it('says the creator’s message over their seat while the duel waits', () => {
    expect(arenaView(duelView({ message: 'gg, best of 3' }), 'created').note).toBe('gg, best of 3');
  });

  it('says nothing for a message of spaces alone', () => {
    expect(arenaView(duelView({ message: '   ' }), 'created').note).toBeNull();
  });

  it('keeps the message off the seat once someone joined', () => {
    expect(arenaView(joined({ message: 'gg' }), 'funded').note).toBeNull();
  });

  it('locks both stakes while the match is played', () => {
    expect(arenaView(joined(), 'funded')).toMatchObject({
      isJoined: true,
      staked: { creator: true, opponent: true },
      totalRaw: STAKE * 2n,
      isLocked: true,
      vault: 'locked',
      match: 'play',
    });
  });

  it('pauses the match on the side of the player who asked to stop', () => {
    const view = arenaView(joined({ cancelRequestedBy: OPPONENT }), 'cancelReq');

    expect(view).toMatchObject({ isLocked: true, vault: 'paused', match: 'paused' });
    expect(view.seats.opponent.say).toBe('callOff');
    expect(view.seats.creator.say).toBeNull();
  });

  it('runs the clock of the player who has to answer a reported win', () => {
    const view = arenaView(claimedBy(OPPONENT), 'claimed');

    expect(view.seats.opponent).toMatchObject({ say: 'won', timer: null });
    expect(view.seats.creator).toMatchObject({ say: null, timer: 'running' });
    expect(view).toMatchObject({ vault: 'locked', match: null });
  });

  it('unlocks the safe when the time to answer runs out', () => {
    const view = arenaView(claimedBy(CREATOR), 'timeout');

    expect(view).toMatchObject({ isLocked: false, vault: 'unlocked', staked: { creator: true, opponent: true } });
    expect(view.seats.creator.say).toBe('won');
    expect(view.seats.opponent.timer).toBe('up');
  });

  it('matches an address whatever its letter case', () => {
    const view = arenaView(claimedBy(`0x${OPPONENT.slice(2).toUpperCase()}`), 'claimed');

    expect(view.seats.opponent.say).toBe('won');
  });
});

describe('arenaView of a won duel', () => {
  const confirmed = claimedBy(CREATOR, { opponentPayout: 0n, creatorPayout: STAKE * 2n });

  it('keeps the pot in the sun for the winner until they take it', () => {
    const view = arenaView(confirmed, 'resolved');

    expect(view).toMatchObject({ staked: { creator: true, opponent: true }, isPayout: true, vault: 'forWinner', totalRaw: STAKE * 2n });
    expect(view.seats.creator).toMatchObject({ isWinner: true, money: { kind: 'ready', raw: STAKE * 2n }, marks: ['honored'] });
    expect(view.seats.opponent).toMatchObject({ isWinner: false, money: null, say: 'confirm', marks: ['honored'] });
    expect(view.showsLevels).toBe(false);
  });

  it('empties the safe once the winner took the pot', () => {
    const view = arenaView({ ...confirmed, creatorClaimed: true }, 'resolved');

    expect(view).toMatchObject({ staked: { creator: false, opponent: false }, isPayout: false, vault: 'paid', totalRaw: 0n });
    expect(view.seats.creator.money).toEqual({ kind: 'done', raw: STAKE * 2n });
  });

  it('has the loser say they lost when they admitted defeat', () => {
    const admitted = joined({ claimedBy: CREATOR, claimedWinner: OPPONENT, opponentPayout: STAKE * 2n });

    const view = arenaView(admitted, 'resolved');

    expect(view.seats.opponent.isWinner).toBe(true);
    expect(view.seats.creator.say).toBe('lost');
  });
});

describe('arenaView of a duel with no winner', () => {
  const bothBack = { creatorPayout: STAKE, opponentPayout: STAKE };

  it('marks the player who reported honored and the silent one abandoned after a refund', () => {
    const view = arenaView(claimedBy(OPPONENT, bothBack), 'refunded');

    expect(view.seats.opponent.marks).toEqual(['honored']);
    expect(view.seats.creator).toMatchObject({ marks: ['abandoned'], timer: 'up' });
  });

  it('gives each player their stake back, out of the sun', () => {
    const view = arenaView(claimedBy(OPPONENT, { ...bothBack, creatorClaimed: true }), 'refunded');

    expect(view).toMatchObject({ staked: { creator: false, opponent: true }, isPayout: false, vault: 'returning', totalRaw: STAKE });
    expect(view.seats.creator.money).toEqual({ kind: 'returned', raw: STAKE });
    expect(view.seats.opponent.money).toEqual({ kind: 'back', raw: STAKE });
  });

  it('says the stakes were returned once both are taken', () => {
    const view = arenaView(joined({ ...bothBack, creatorClaimed: true, opponentClaimed: true }), 'mutual');

    expect(view).toMatchObject({ vault: 'returned', totalRaw: 0n });
  });

  it('has the player who did not report dispute it, with no marks', () => {
    const view = arenaView(claimedBy(CREATOR, bothBack), 'disputed');

    expect(view.seats.opponent.say).toBe('dispute');
    expect(view.seats.creator.marks).toEqual([]);
    expect(view.seats.opponent.marks).toEqual([]);
  });

  it('has the other player agree to stop', () => {
    const view = arenaView(joined({ ...bothBack, cancelRequestedBy: CREATOR }), 'mutual');

    expect(view.seats.opponent.say).toBe('agree');
    expect(view.seats.creator.say).toBeNull();
  });

  it('has the invited player say no to a declined duel, the creator’s stake alone going back', () => {
    const view = arenaView(joined({ creatorPayout: STAKE }), 'declined');

    expect(view.seats.opponent).toMatchObject({ say: 'decline', money: null });
    expect(view.seats.creator.money).toEqual({ kind: 'back', raw: STAKE });
    expect(view).toMatchObject({ staked: { creator: true, opponent: false }, vault: 'returning' });
  });

  it('leaves the second seat open on a cancelled duel', () => {
    const view = arenaView(duelView({ opponent: ZERO_ADDRESS, creatorPayout: STAKE }), 'cancelled');

    expect(view).toMatchObject({ isJoined: false, staked: { creator: true, opponent: false }, showsLevels: false });
  });
});

describe('arenaView in every phase', () => {
  const PHASES: DuelPhase[] = ['created', 'funded', 'cancelReq', 'claimed', 'timeout', 'resolved', 'refunded', 'disputed', 'mutual', 'cancelled', 'declined'];

  it.each(PHASES)('counts in the safe exactly the stakes in its window (%s)', (phase) => {
    const view = arenaView(claimedBy(CREATOR, { creatorPayout: STAKE, opponentPayout: STAKE, cancelRequestedBy: CREATOR }), phase);
    const inside = [view.staked.creator, view.staked.opponent].filter(Boolean).length;

    expect(view.totalRaw).toBe(STAKE * BigInt(inside));
  });
});

describe('hasActed', () => {
  it('sees a player joining, speaking or their clock starting', () => {
    expect(hasActed(arenaView(duelView(), 'created'), arenaView(joined(), 'funded'))).toBe(true);
    expect(hasActed(arenaView(joined(), 'funded'), arenaView(claimedBy(CREATOR), 'claimed'))).toBe(true);
  });

  it('sees nothing when only the money moved', () => {
    const waiting = claimedBy(CREATOR, { creatorPayout: STAKE * 2n });

    expect(hasActed(arenaView(waiting, 'resolved'), arenaView({ ...waiting, creatorClaimed: true }, 'resolved'))).toBe(false);
  });
});

describe('actorsFirst', () => {
  it('lets the players speak and the clock start while the money stays put', () => {
    const from = arenaView(joined(), 'funded');
    const to = arenaView(claimedBy(CREATOR, { creatorPayout: STAKE * 2n }), 'resolved');

    const beat = actorsFirst(from, to);

    expect(beat.seats.opponent.say).toBe('confirm');
    expect(beat).toMatchObject({ staked: from.staked, isPayout: false, isLocked: true, vault: 'locked', showsLevels: true });
    expect(beat.seats.creator).toMatchObject({ money: null, marks: [], isWinner: false });
  });
});

describe('arrivalView', () => {
  it('opens on an empty safe with the players already seated', () => {
    const to = arenaView(claimedBy(OPPONENT), 'claimed');

    expect(arrivalView(to)).toMatchObject({
      staked: { creator: false, opponent: false },
      totalRaw: 0n,
      isLocked: false,
      seats: to.seats,
      vault: 'locked',
    });
  });
});
