import { describe, expect, it } from 'vitest';
import { DuelState } from '@/lib/contracts';
import { duelPhase, duelSteps, phaseLabel, secondsToAnswer, type DuelPhase } from '@/lib/duelPhase';
import { duelView } from './helpers/duelView';

const CLAIM_TIMEOUT = 3600;
const CLAIMED_AT = 1_800_000_000;

describe('secondsToAnswer', () => {
  it('counts down from the claim timeout once a win is reported', () => {
    const duel = duelView({ claimTimestamp: BigInt(CLAIMED_AT) });

    expect(secondsToAnswer(duel, CLAIMED_AT + 600, CLAIM_TIMEOUT)).toBe(3000);
  });

  it('never goes below zero after the time ran out', () => {
    const duel = duelView({ claimTimestamp: BigInt(CLAIMED_AT) });

    expect(secondsToAnswer(duel, CLAIMED_AT + CLAIM_TIMEOUT + 90, CLAIM_TIMEOUT)).toBe(0);
  });

  it('is zero while nobody reported a win', () => {
    expect(secondsToAnswer(duelView(), CLAIMED_AT, CLAIM_TIMEOUT)).toBe(0);
  });
});

describe('duelPhase', () => {
  it.each([
    [DuelState.Created, 'created'],
    [DuelState.Funded, 'funded'],
    [DuelState.Resolved, 'resolved'],
    [DuelState.Refunded, 'refunded'],
    [DuelState.Cancelled, 'cancelled'],
    [DuelState.Declined, 'declined'],
    [DuelState.Disputed, 'disputed'],
    [DuelState.MutualCancelRequested, 'cancelReq'],
    [DuelState.MutuallyCancelled, 'mutual'],
  ] as const)('reads state %i as %s', (state, phase) => {
    expect(duelPhase(duelView({ state }), CLAIMED_AT, CLAIM_TIMEOUT)).toBe(phase);
  });

  it('keeps a reported win claimed while the time to answer runs', () => {
    const duel = duelView({ state: DuelState.WinnerClaimed, claimTimestamp: BigInt(CLAIMED_AT) });

    expect(duelPhase(duel, CLAIMED_AT + CLAIM_TIMEOUT - 1, CLAIM_TIMEOUT)).toBe('claimed');
  });

  it('times a reported win out the second the time to answer ends', () => {
    const duel = duelView({ state: DuelState.WinnerClaimed, claimTimestamp: BigInt(CLAIMED_AT) });

    expect(duelPhase(duel, CLAIMED_AT + CLAIM_TIMEOUT, CLAIM_TIMEOUT)).toBe('timeout');
  });

  it('refuses a duel nobody created', () => {
    expect(() => duelPhase(duelView({ state: DuelState.Nonexistent }), CLAIMED_AT, CLAIM_TIMEOUT)).toThrow();
  });
});

describe('phaseLabel', () => {
  it('pulses while a player has to act', () => {
    expect(phaseLabel(duelView(), 'funded')).toEqual({ key: 'duel.inProgress', tone: 'live', isLive: true });
    expect(phaseLabel(duelView(), 'claimed')).toMatchObject({ key: 'duel.waitingConfirm', isLive: true });
  });

  it('says the refunds are open while a stake still waits in the contract', () => {
    const duel = duelView({ creatorPayout: 5_000_000n, opponentPayout: 5_000_000n, creatorClaimed: true });

    expect(phaseLabel(duel, 'refunded')).toEqual({ key: 'room.state.refunded', tone: 'back', isLive: false });
  });

  it('says the duel was refunded once both stakes are taken', () => {
    const duel = duelView({ creatorPayout: 5_000_000n, opponentPayout: 5_000_000n, creatorClaimed: true, opponentClaimed: true });

    expect(phaseLabel(duel, 'refunded')).toMatchObject({ key: 'duel.refunded', tone: 'back' });
  });

  it('names a timed-out claim late', () => {
    expect(phaseLabel(duelView(), 'timeout')).toEqual({ key: 'duel.responseTimedOut', tone: 'late', isLive: false });
  });
});

/** The steps as short strings: kind, then mode or tone, then a label other than the step's own. */
function stepsOf(phase: DuelPhase, overrides = {}) {
  return duelSteps(duelView(overrides), phase).map((step, index) =>
    [step.kind, step.mode ?? step.tone, step.label === `sim.step.${index + 1}` ? undefined : step.label].filter(Boolean).join(' ')
  );
}

describe('duelSteps', () => {
  it('waits on the second step for an opponent', () => {
    expect(stepsOf('created')).toEqual(['done', 'current waiting', 'todo', 'todo', 'todo']);
  });

  it('plays on the third step, paused while the players talk of stopping', () => {
    expect(stepsOf('funded')).toEqual(['done', 'done', 'current waiting', 'todo', 'todo']);
    expect(stepsOf('cancelReq')).toEqual(['done', 'done', 'current paused', 'todo', 'todo']);
  });

  it('runs the clock on the report step', () => {
    expect(stepsOf('claimed')).toEqual(['done', 'done', 'done', 'current timed', 'todo']);
  });

  it('ends the report step when time runs out and waits for the refund', () => {
    expect(stepsOf('timeout')).toEqual(['done', 'done', 'done', 'end late room.step.timeUp', 'current waiting room.step.refunded']);
  });

  it('ends a refunded duel on the refund', () => {
    expect(stepsOf('refunded')).toEqual(['done', 'done', 'done', 'end late room.step.timeUp', 'end back room.step.refunded']);
  });

  it('says Won until the winner takes the pot, then Paid out', () => {
    expect(stepsOf('resolved', { creatorPayout: 10_000_000n })).toEqual(['done', 'done', 'done', 'done', 'end paid room.step.won']);
    expect(stepsOf('resolved', { creatorPayout: 10_000_000n, creatorClaimed: true })).toEqual([
      'done',
      'done',
      'done',
      'done',
      'end paid room.step.paid',
    ]);
  });

  it('ends a disputed duel after the report', () => {
    expect(stepsOf('disputed')).toEqual(['done', 'done', 'done', 'done', 'end back room.step.disputed']);
  });

  it('skips the report of a duel called off by agreement', () => {
    expect(stepsOf('mutual')).toEqual(['done', 'done', 'done', 'skipped', 'end back room.step.calledOff']);
  });

  it('skips everything after the first step of a duel nobody joined', () => {
    expect(stepsOf('cancelled')).toEqual(['done', 'skipped', 'skipped', 'skipped', 'end back room.step.cancelled']);
    expect(stepsOf('declined')).toEqual(['done', 'skipped', 'skipped', 'skipped', 'end back room.step.declined']);
  });
});
