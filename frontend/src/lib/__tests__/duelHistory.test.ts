import { describe, expect, it } from 'vitest';
import type { Duel } from '@/lib/contracts';
import { duelHistory } from '@/lib/duelHistory';
import { duelView } from './helpers/duelView';

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
const HOUR = 3600;

function joined(overrides: Partial<Duel> = {}): Duel {
  return duelView({ creator: CREATOR, opponent: OPPONENT, createdAt: 100n, fundedAt: 200n, ...overrides });
}

function keysOf(duel: Duel, phase: Parameters<typeof duelHistory>[1]) {
  return duelHistory(duel, phase, HOUR).map((event) => event.key);
}

describe('duelHistory', () => {
  it('starts with the creator making the duel, their message quoted', () => {
    const [created] = duelHistory(duelView({ message: 'gg, best of 3', createdAt: 100n }), 'created', HOUR);

    expect(created).toEqual({ key: 'room.ev.created', at: 100n, tone: 'creator', who: CREATOR, quote: 'gg, best of 3' });
  });

  it('quotes nothing for a message of spaces alone', () => {
    expect(duelHistory(duelView({ message: '   ' }), 'created', HOUR)[0].quote).toBeNull();
  });

  it('adds the opponent joining in their colour', () => {
    expect(duelHistory(joined(), 'funded', HOUR)[1]).toMatchObject({ key: 'room.ev.joined', at: 200n, tone: 'opponent', who: OPPONENT });
  });

  it('adds a request to call it off by whoever asked', () => {
    const events = duelHistory(joined({ cancelRequestedBy: OPPONENT, cancelRequestedAt: 300n }), 'cancelReq', HOUR);

    expect(events[2]).toMatchObject({ key: 'room.ev.callOff', tone: 'opponent', who: OPPONENT });
  });

  it('adds a reported win by its winner', () => {
    const duel = joined({ claimedBy: CREATOR, claimedWinner: CREATOR, claimTimestamp: 400n });

    expect(duelHistory(duel, 'claimed', HOUR)[2]).toMatchObject({ key: 'room.ev.won', tone: 'creator', who: CREATOR });
  });

  it('reads a loss reported by the loser as one', () => {
    const duel = joined({ claimedBy: OPPONENT, claimedWinner: CREATOR, claimTimestamp: 400n, finalizedAt: 400n });

    expect(keysOf(duel, 'resolved')).toEqual(['room.ev.created', 'room.ev.joined', 'room.ev.lost', 'room.ev.paid']);
  });

  it('adds the confirmation and the payout to a win the other player confirmed', () => {
    const duel = joined({ claimedBy: CREATOR, claimedWinner: CREATOR, claimTimestamp: 400n, finalizedAt: 500n });
    const events = duelHistory(duel, 'resolved', HOUR);

    expect(events.slice(3)).toEqual([
      { key: 'room.ev.confirmed', at: 500n, tone: 'opponent', who: OPPONENT, quote: null },
      { key: 'room.ev.paid', at: 500n, tone: 'sun', who: CREATOR, quote: null },
    ]);
  });

  it('marks the moment the time to answer ran out, from the contract’s timeout', () => {
    const duel = joined({ claimedBy: CREATOR, claimedWinner: CREATOR, claimTimestamp: 400n });

    expect(duelHistory(duel, 'timeout', HOUR)[3]).toMatchObject({ key: 'room.ev.timeUp', at: 400n + 3600n, tone: 'late', who: null });
  });

  it('ends a refunded duel with the refunds unlocked by the contract', () => {
    const duel = joined({ claimedBy: CREATOR, claimedWinner: CREATOR, claimTimestamp: 400n, finalizedAt: 5000n });

    expect(duelHistory(duel, 'refunded', HOUR).slice(3)).toMatchObject([
      { key: 'room.ev.timeUp', tone: 'late' },
      { key: 'room.ev.refunded', at: 5000n, tone: 'ink', who: null },
    ]);
  });

  it('ends a disputed duel with the player who answered disputing', () => {
    const duel = joined({ claimedBy: CREATOR, claimedWinner: CREATOR, claimTimestamp: 400n, finalizedAt: 500n });

    expect(duelHistory(duel, 'disputed', HOUR).at(-1)).toMatchObject({ key: 'room.ev.disputed', tone: 'opponent', who: OPPONENT });
  });

  it('ends a duel called off with the player who agreed', () => {
    const duel = joined({ cancelRequestedBy: CREATOR, cancelRequestedAt: 300n, finalizedAt: 350n });

    expect(duelHistory(duel, 'mutual', HOUR).at(-1)).toMatchObject({ key: 'room.ev.mutual', tone: 'opponent', who: OPPONENT });
  });

  it('ends a cancelled duel with its creator', () => {
    expect(duelHistory(duelView({ finalizedAt: 50n }), 'cancelled', HOUR).at(-1)).toMatchObject({ key: 'room.ev.cancelled', tone: 'creator', who: CREATOR });
  });

  it('ends a declined duel with the player who declined, who never joined', () => {
    const duel = duelView({ opponent: OPPONENT, finalizedAt: 50n });

    expect(keysOf(duel, 'declined')).toEqual(['room.ev.created', 'room.ev.declined']);
  });
});
