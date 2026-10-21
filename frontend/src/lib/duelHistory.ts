import type { TranslationKey } from '@/i18n/translations';
import type { Duel } from '@/lib/contracts';
import { ZERO_ADDRESS, seatOf, type SeatSide } from '@/lib/duel';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import type { DuelPhase } from '@/lib/duelPhase';

/** The colour of who acted: a seat, the winner's sun, the clock running out, or the contract. */
export type HistoryTone = SeatSide | 'sun' | 'late' | 'ink';

export interface HistoryEvent {
  key: TranslationKey;
  /** When it happened, in seconds. */
  at: bigint;
  tone: HistoryTone;
  /** Who acted; null for what the clock or the contract did. */
  who: `0x${string}` | null;
  /** The creator's own words, quoted under the duel's first line. */
  quote: string | null;
}

export type HistoryDuel = Pick<
  Duel,
  | 'creator'
  | 'opponent'
  | 'message'
  | 'claimedBy'
  | 'claimedWinner'
  | 'cancelRequestedBy'
  | 'createdAt'
  | 'fundedAt'
  | 'cancelRequestedAt'
  | 'claimTimestamp'
  | 'finalizedAt'
>;

const otherSide = (side: SeatSide): SeatSide => (side === 'creator' ? 'opponent' : 'creator');

/**
 * What happened in a duel, oldest first, each line coloured by who did it: the moments the contract
 * recorded, with the time to answer running out as one more. A win is reported by the winner and a
 * loss by the loser (`admitDefeat`), which needs no confirmation.
 */
export function duelHistory(duel: HistoryDuel, phase: DuelPhase, claimTimeout: number): HistoryEvent[] {
  const addressOf = (side: SeatSide) => (side === 'creator' ? duel.creator : duel.opponent);
  const event = (key: TranslationKey, at: bigint, tone: HistoryTone, who: `0x${string}` | null = null): HistoryEvent => ({
    key,
    at,
    tone,
    who,
    quote: null,
  });
  const claimer = seatOf(duel, duel.claimedBy) ?? 'creator';
  const responder = otherSide(claimer);
  const requester = seatOf(duel, duel.cancelRequestedBy) ?? 'creator';
  const isAdmitted = duel.claimedBy.toLowerCase() !== duel.claimedWinner.toLowerCase();

  const events: HistoryEvent[] = [
    { ...event('room.ev.created', duel.createdAt, 'creator', duel.creator), quote: hasVisibleDuelMessage(duel.message) ? duel.message : null },
  ];
  if (duel.fundedAt > 0n && duel.opponent.toLowerCase() !== ZERO_ADDRESS) {
    events.push(event('room.ev.joined', duel.fundedAt, 'opponent', duel.opponent));
  }
  if (duel.cancelRequestedAt > 0n) {
    events.push(event('room.ev.callOff', duel.cancelRequestedAt, requester, duel.cancelRequestedBy));
  }
  if (duel.claimTimestamp > 0n) {
    events.push(event(isAdmitted ? 'room.ev.lost' : 'room.ev.won', duel.claimTimestamp, claimer, duel.claimedBy));
  }
  if (phase === 'timeout' || phase === 'refunded') {
    events.push(event('room.ev.timeUp', duel.claimTimestamp + BigInt(claimTimeout), 'late'));
  }
  switch (phase) {
    case 'resolved':
      if (!isAdmitted) events.push(event('room.ev.confirmed', duel.finalizedAt, responder, addressOf(responder)));
      events.push(event('room.ev.paid', duel.finalizedAt, 'sun', duel.claimedWinner));
      break;
    case 'refunded':
      events.push(event('room.ev.refunded', duel.finalizedAt, 'ink'));
      break;
    case 'disputed':
      events.push(event('room.ev.disputed', duel.finalizedAt, responder, addressOf(responder)));
      break;
    case 'mutual':
      events.push(event('room.ev.mutual', duel.finalizedAt, otherSide(requester), addressOf(otherSide(requester))));
      break;
    case 'cancelled':
      events.push(event('room.ev.cancelled', duel.finalizedAt, 'creator', duel.creator));
      break;
    case 'declined':
      events.push(event('room.ev.declined', duel.finalizedAt, 'opponent', duel.opponent));
      break;
  }
  return events;
}
