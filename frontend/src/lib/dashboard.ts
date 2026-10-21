import type { TranslationKey } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import { ZERO_ADDRESS, seatOf, type DuelRecord, type SeatSide } from '@/lib/duel';
import { duelPhase, type DuelPhase } from '@/lib/duelPhase';
import { isPublicDuel } from '@/lib/invite';

/** One of the reader's duels as the dashboard files it: the duel, where it stands now, and their seat. */
export interface MyDuel {
  duel: DuelRecord;
  phase: DuelPhase;
  seat: SeatSide;
}

/** Whose move a duel that is on waits for: the reader's, or the other player's (an answer, or a player to join). */
export type Turn = 'you' | 'them';

/** How a finished duel ended for the reader. */
export type Outcome = 'won' | 'lost' | 'none';

export interface MyDuels {
  /** Duels on where the move is the reader's, the most pressing first. */
  yours: MyDuel[];
  /** Duels on that wait for the other player, or for someone to join. */
  theirs: MyDuel[];
  /** Finished duels, the newest first; a reported win whose time to answer ran out is one of them. */
  past: MyDuel[];
}

/** Why a duel ended with no winner, for each phase that ends so; a declined one names who declined (`{other}`). */
export const NO_WINNER_REASONS: Partial<Record<DuelPhase, TranslationKey>> = {
  timeout: 'dash.why.timeout',
  refunded: 'dash.why.timeout',
  disputed: 'dash.why.disputed',
  mutual: 'dash.why.mutual',
  cancelled: 'dash.why.cancelled',
  declined: 'dash.why.declined',
};

/** The phases a duel is still being played in. */
const ON_PHASES: ReadonlySet<DuelPhase> = new Set(['created', 'funded', 'cancelReq', 'claimed']);

/** A clock running out first, then a request to answer, then a match to report, then a duel waiting for its opponent. */
const URGENCY: Partial<Record<DuelPhase, number>> = { claimed: 0, cancelReq: 1, funded: 2, created: 3 };

/** Whether `address` is the player sitting in `seat`. */
function isSeated(duel: DuelRecord, address: string, seat: SeatSide): boolean {
  return seatOf(duel, address) === seat;
}

/** Whose move a duel that is on waits for. */
export function turnOf({ duel, phase, seat }: MyDuel): Turn {
  if (phase === 'funded') return 'you';
  if (phase === 'claimed') return isSeated(duel, duel.claimedBy, seat) ? 'them' : 'you';
  if (phase === 'cancelReq') return isSeated(duel, duel.cancelRequestedBy, seat) ? 'them' : 'you';
  return 'them';
}

/** What a duel that is on needs, in a line; a line about the other player names them as `{other}`. */
export function turnLineKey(entry: MyDuel): TranslationKey {
  const { duel, phase, seat } = entry;
  switch (phase) {
    case 'created':
      return isPublicDuel(duel.inviteHash) ? 'dash.line.created.public' : 'dash.line.created.private';
    case 'claimed':
      return isSeated(duel, duel.claimedBy, seat) ? 'dash.line.claimed.you' : 'dash.line.claimed.other';
    case 'cancelReq':
      return isSeated(duel, duel.cancelRequestedBy, seat) ? 'dash.line.cancelReq.you' : 'dash.line.cancelReq.other';
    default:
      return 'dash.line.funded';
  }
}

/** The button that opens a duel that is on: to answer, to report the result, or just to look. */
export function goKey(entry: MyDuel): TranslationKey {
  if (turnOf(entry) === 'them') return 'dash.go.open';
  return entry.phase === 'funded' ? 'dash.go.report' : 'dash.go.answer';
}

function byUrgency(a: MyDuel, b: MyDuel): number {
  const order = (URGENCY[a.phase] ?? 0) - (URGENCY[b.phase] ?? 0);
  if (order !== 0) return order;
  // The clock that runs out first comes first.
  if (a.phase === 'claimed') return Number(a.duel.claimTimestamp - b.duel.claimTimestamp);
  return b.duel.id - a.duel.id;
}

/**
 * The reader's duels at `now`, in seconds: those on, split by whose move it is, and the finished
 * ones. `duels` are the reader's own (`duelsOf`).
 */
export function myDuels(duels: readonly DuelRecord[], viewer: string, now: number, claimTimeout: number): MyDuels {
  const split: MyDuels = { yours: [], theirs: [], past: [] };
  for (const duel of duels) {
    const seat = seatOf(duel, viewer);
    if (!seat) continue;
    const entry: MyDuel = { duel, phase: duelPhase(duel, now, claimTimeout), seat };
    if (!ON_PHASES.has(entry.phase)) split.past.push(entry);
    else if (turnOf(entry) === 'you') split.yours.push(entry);
    else split.theirs.push(entry);
  }
  split.yours.sort(byUrgency);
  split.theirs.sort(byUrgency);
  split.past.sort((a, b) => b.duel.id - a.duel.id);
  return split;
}

/**
 * The moment, at or before `now`, from which the phases of `duels` read the same as at `now`: the
 * latest time to answer a reported win that has run out, or zero. It changes only when another one
 * runs out, so a screen that files duels by phase can follow it instead of every second.
 */
export function phaseClock(duels: readonly DuelRecord[], now: number, claimTimeout: number): number {
  let latest = 0;
  for (const duel of duels) {
    if (duel.state !== DuelState.WinnerClaimed || duel.claimTimestamp === 0n) continue;
    const deadline = Number(duel.claimTimestamp) + claimTimeout;
    if (deadline <= now && deadline > latest) latest = deadline;
  }
  return latest;
}

/** The other player in the reader's duel, or null while nobody has taken the second seat. */
export function otherOf({ duel, seat }: MyDuel): `0x${string}` | null {
  const address = seat === 'creator' ? duel.opponent : duel.creator;
  return address.toLowerCase() === ZERO_ADDRESS ? null : address;
}

export function outcomeOf({ duel, phase, seat }: MyDuel): Outcome {
  if (phase !== 'resolved') return 'none';
  return isSeated(duel, duel.claimedWinner, seat) ? 'won' : 'lost';
}

/** What the duel won or cost the reader, in USDT's smallest unit: the other player's stake, either way, or nothing. */
export function netOf(entry: MyDuel): bigint {
  const outcome = outcomeOf(entry);
  if (outcome === 'won') return entry.duel.wagerAmount;
  if (outcome === 'lost') return -entry.duel.wagerAmount;
  return 0n;
}

/** Whether the reader is the one who reported the win in a duel whose time to answer ran out. */
export function reportedWin({ duel, seat }: MyDuel): boolean {
  return isSeated(duel, duel.claimedBy, seat);
}

/** When the duel last moved, in seconds: its end, else its reported win, else its making. */
export function lastMoveAt({ duel }: MyDuel): bigint {
  if (duel.finalizedAt > 0n) return duel.finalizedAt;
  if (duel.claimTimestamp > 0n) return duel.claimTimestamp;
  return duel.createdAt;
}

export interface MyTotals {
  wins: number;
  losses: number;
  /** In USDT's smallest unit: the stakes of duels on and of duels won or lost, not of those that came back. */
  stakedRaw: bigint;
  /** In USDT's smallest unit: everything the reader has taken out of the contract. */
  takenRaw: bigint;
}

const STAKED_STATES: ReadonlySet<DuelState> = new Set([
  DuelState.Created,
  DuelState.Funded,
  DuelState.WinnerClaimed,
  DuelState.MutualCancelRequested,
  DuelState.Resolved,
]);

/** The reader's totals over their duels: wins and losses, what they staked and what they took out. */
export function myTotals(entries: readonly MyDuel[]): MyTotals {
  const totals: MyTotals = { wins: 0, losses: 0, stakedRaw: 0n, takenRaw: 0n };
  for (const entry of entries) {
    const { duel, seat } = entry;
    const outcome = outcomeOf(entry);
    if (outcome === 'won') totals.wins += 1;
    if (outcome === 'lost') totals.losses += 1;
    if (STAKED_STATES.has(duel.state)) totals.stakedRaw += duel.wagerAmount;
    const [payout, claimed] = seat === 'creator' ? [duel.creatorPayout, duel.creatorClaimed] : [duel.opponentPayout, duel.opponentClaimed];
    if (claimed) totals.takenRaw += payout;
  }
  return totals;
}
