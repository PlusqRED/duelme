import type { Duel } from '@/lib/contracts';
import { SEAT_SIDES, ZERO_ADDRESS, seatOf, type CountdownTimer, type SafeTone, type SeatSay, type SeatSide } from '@/lib/duel';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { RETURNING_PHASES, type DuelPhase } from '@/lib/duelPhase';
import type { ReputationMark } from '@/lib/reputation';

/** What the contract pays a player once the duel is over: a win to take or taken, a stake to take back or returned. */
export type MoneyKind = 'ready' | 'done' | 'back' | 'returned';

export interface ArenaSeat {
  say: SeatSay | null;
  /** Their time to answer a reported win. */
  timer: CountdownTimer;
  money: { kind: MoneyKind; raw: bigint } | null;
  /** What the duel added to their record. */
  marks: ReputationMark[];
  isWinner: boolean;
}

/** Everything the duel page's arena shows, as plain data, so a change can be animated as a difference. */
export interface ArenaView {
  seats: Record<SeatSide, ArenaSeat>;
  /** The second seat is taken: someone joined, or declined. */
  isJoined: boolean;
  /** The creator's message, said over their seat while the duel waits for an opponent. */
  note: string | null;
  /** One player's stake, in USDT's smallest unit. */
  stakeRaw: bigint;
  /** Which stakes sit in the safe's window. */
  staked: Record<SeatSide, boolean>;
  /** The stakes in the window are the winner's now. */
  isPayout: boolean;
  totalRaw: bigint;
  isLocked: boolean;
  vault: SafeTone;
  /** Over the safe while the money is locked: the match being played, or paused. */
  match: 'play' | 'paused' | null;
  /** Each player's level shows under their seat until the duel is settled; then their money does. */
  showsLevels: boolean;
}

export type ArenaDuel = Pick<
  Duel,
  | 'creator'
  | 'opponent'
  | 'wagerAmount'
  | 'message'
  | 'claimedBy'
  | 'claimedWinner'
  | 'cancelRequestedBy'
  | 'creatorPayout'
  | 'opponentPayout'
  | 'creatorClaimed'
  | 'opponentClaimed'
>;

const otherSide = (side: SeatSide): SeatSide => (side === 'creator' ? 'opponent' : 'creator');

function payoutOf(duel: ArenaDuel, side: SeatSide): bigint {
  return side === 'creator' ? duel.creatorPayout : duel.opponentPayout;
}

function claimedOf(duel: ArenaDuel, side: SeatSide): boolean {
  return side === 'creator' ? duel.creatorClaimed : duel.opponentClaimed;
}

/** What the contract still keeps for `side`. Payouts are pull-based: a win or a stake waits there until taken. */
function owedOf(duel: ArenaDuel, side: SeatSide): bigint {
  return claimedOf(duel, side) ? 0n : payoutOf(duel, side);
}

function emptySeat(): ArenaSeat {
  return { say: null, timer: null, money: null, marks: [], isWinner: false };
}

/** The arena of `duel` in `phase`: the seats, what each player says, and the money in the safe. */
export function arenaView(duel: ArenaDuel, phase: DuelPhase): ArenaView {
  const seats: Record<SeatSide, ArenaSeat> = { creator: emptySeat(), opponent: emptySeat() };
  const view: ArenaView = {
    seats,
    isJoined: duel.opponent.toLowerCase() !== ZERO_ADDRESS,
    note: null,
    stakeRaw: duel.wagerAmount,
    staked: { creator: false, opponent: false },
    isPayout: false,
    totalRaw: 0n,
    isLocked: false,
    vault: 'waiting',
    match: null,
    showsLevels: true,
  };
  // A claim and a cancel request are only read in the phases that have one, where the address is set.
  const claimer = seatOf(duel, duel.claimedBy) ?? 'creator';
  const responder = otherSide(claimer);
  const requester = seatOf(duel, duel.cancelRequestedBy) ?? 'creator';

  switch (phase) {
    case 'created':
      view.staked.creator = true;
      view.note = hasVisibleDuelMessage(duel.message) ? duel.message : null;
      break;
    case 'funded':
    case 'cancelReq':
    case 'claimed':
    case 'timeout':
      view.staked = { creator: true, opponent: true };
      view.isLocked = phase !== 'timeout';
      view.vault = phase === 'cancelReq' ? 'paused' : phase === 'timeout' ? 'unlocked' : 'locked';
      break;
    case 'resolved': {
      const winner = seatOf(duel, duel.claimedWinner) ?? 'creator';
      const isWaiting = owedOf(duel, winner) > 0n;
      view.staked = { creator: isWaiting, opponent: isWaiting };
      view.isPayout = isWaiting;
      view.vault = isWaiting ? 'forWinner' : 'paid';
      seats[winner].isWinner = true;
      // admitDefeat leaves the loser as the one who reported: they said they lost, nobody had to confirm.
      seats[otherSide(winner)].say = claimer === winner ? 'confirm' : 'lost';
      seats.creator.marks = ['honored'];
      seats.opponent.marks = ['honored'];
      break;
    }
    default:
      for (const side of SEAT_SIDES) view.staked[side] = owedOf(duel, side) > 0n;
      view.vault = view.staked.creator || view.staked.opponent ? 'returning' : 'returned';
  }

  if (phase === 'funded') view.match = 'play';
  if (phase === 'cancelReq') {
    view.match = 'paused';
    seats[requester].say = 'callOff';
  }
  if (phase === 'claimed' || phase === 'timeout') seats[claimer].say = 'won';
  if (phase === 'claimed') seats[responder].timer = 'running';
  if (phase === 'timeout' || phase === 'refunded') seats[responder].timer = 'up';
  if (phase === 'refunded') {
    seats[claimer].marks = ['honored'];
    seats[responder].marks = ['abandoned'];
  }
  if (phase === 'disputed') seats[responder].say = 'dispute';
  if (phase === 'mutual') seats[otherSide(requester)].say = 'agree';
  if (phase === 'declined') seats.opponent.say = 'decline';

  if (phase === 'resolved' || RETURNING_PHASES.has(phase)) {
    view.showsLevels = false;
    // The sun is for the winner's payout only; a stake going back is not a prize.
    const isPrize = phase === 'resolved';
    for (const side of SEAT_SIDES) {
      const raw = payoutOf(duel, side);
      if (raw === 0n) continue;
      const kind: MoneyKind = claimedOf(duel, side) ? (isPrize ? 'done' : 'returned') : isPrize ? 'ready' : 'back';
      seats[side].money = { kind, raw };
    }
  }

  view.totalRaw = duel.wagerAmount * BigInt(SEAT_SIDES.filter((side) => view.staked[side]).length);
  return view;
}

/**
 * The first beat of a move: the players act — someone sits down, speaks, or their clock starts or
 * runs out — while the money, the lock and what the duel adds to each record wait for the contract.
 */
export function actorsFirst(from: ArenaView, to: ArenaView): ArenaView {
  const seat = (side: SeatSide): ArenaSeat => ({
    ...to.seats[side],
    money: from.seats[side].money,
    marks: from.seats[side].marks,
    isWinner: from.seats[side].isWinner,
  });
  return {
    ...to,
    seats: { creator: seat('creator'), opponent: seat('opponent') },
    staked: from.staked,
    isPayout: from.isPayout,
    totalRaw: from.totalRaw,
    isLocked: from.isLocked,
    vault: from.vault,
    showsLevels: from.showsLevels,
  };
}

/** The arena a moment before `to` as the page opens: the safe still empty, so the stakes drop into it once. */
export function arrivalView(to: ArenaView): ArenaView {
  return { ...to, staked: { creator: false, opponent: false }, isPayout: false, totalRaw: 0n, isLocked: false };
}

/** Whether a player does something visible between two views, which the money then waits for. */
export function hasActed(from: ArenaView, to: ArenaView): boolean {
  return (
    from.isJoined !== to.isJoined ||
    from.note !== to.note ||
    from.match !== to.match ||
    SEAT_SIDES.some((side) => from.seats[side].say !== to.seats[side].say || from.seats[side].timer !== to.seats[side].timer)
  );
}
