import { DuelState, type Duel } from '@/lib/contracts';
import { getContractConfig } from '@/lib/contractConfig';
import { ZERO_ADDRESS } from '@/lib/constants';
import { canPresentInvite } from '@/lib/invite';

export { ZERO_ADDRESS } from '@/lib/constants';

/** A duel as the contract's `DuelView` returns it, plus the id it was read at. */
export type DuelRecord = Duel & { id: number };

/** A player's seat: the creator's is red, the opponent's blue, wherever a duel is drawn. */
export type SeatSide = 'creator' | 'opponent';
export const SEAT_SIDES: readonly SeatSide[] = ['creator', 'opponent'];

/**
 * What the contract's safe, drawn between the seats, says it is doing with the money: empty, one
 * stake in, both locked, paused while the players talk of stopping, unlocked once time ran out, the
 * pot kept for the winner or paid, the stakes going back or returned.
 */
export type SafeTone =
  | 'open'
  | 'waiting'
  | 'locked'
  | 'paused'
  | 'unlocked'
  | 'forWinner'
  | 'paid'
  | 'returning'
  | 'returned';

/** What a player says over their seat about the duel. */
export type SeatSay = 'won' | 'lost' | 'confirm' | 'dispute' | 'callOff' | 'agree' | 'decline';

/** A player's time to answer a reported win: running, run out, or not asked for. */
export type CountdownTimer = 'running' | 'up' | null;

type ClaimableDuel = Pick<
  Duel,
  | 'creator'
  | 'opponent'
  | 'claimedWinner'
  | 'claimedBy'
  | 'state'
  | 'creatorPayout'
  | 'opponentPayout'
  | 'creatorClaimed'
  | 'opponentClaimed'
  | 'createdAt'
  | 'fundedAt'
  | 'cancelRequestedAt'
  | 'claimTimestamp'
  | 'finalizedAt'
>;

type SidePayouts = Pick<Duel, 'creatorPayout' | 'opponentPayout' | 'creatorClaimed' | 'opponentClaimed'>;

/** What the contract pays `side` out of the duel, taken or not. */
export function payoutOf(duel: SidePayouts, side: SeatSide): bigint {
  return side === 'creator' ? duel.creatorPayout : duel.opponentPayout;
}

/** Whether `side` has taken its payout. */
export function hasClaimed(duel: SidePayouts, side: SeatSide): boolean {
  return side === 'creator' ? duel.creatorClaimed : duel.opponentClaimed;
}

/** What the contract still keeps for `side`. Payouts are pull-based: a win or a stake waits there until taken. */
export function owedOf(duel: SidePayouts, side: SeatSide): bigint {
  return hasClaimed(duel, side) ? 0n : payoutOf(duel, side);
}

export function getClaimableAmountForAddress(
  duel: Pick<Duel, 'creator' | 'opponent'> & SidePayouts,
  address?: string | null
): bigint {
  const side = seatOf(duel, address);
  return side ? owedOf(duel, side) : 0n;
}

export function getRelevantDuelTimestamp(duel: ClaimableDuel): bigint {
  if (duel.finalizedAt > 0n) return duel.finalizedAt;
  if (duel.cancelRequestedAt > 0n) return duel.cancelRequestedAt;
  if (duel.claimTimestamp > 0n) return duel.claimTimestamp;
  if (duel.fundedAt > 0n) return duel.fundedAt;
  return duel.createdAt;
}

export function isDuelFullySettled(
  duel: Pick<ClaimableDuel, 'creatorPayout' | 'opponentPayout' | 'creatorClaimed' | 'opponentClaimed'>
): boolean {
  return (
    (duel.creatorPayout === 0n || duel.creatorClaimed)
    && (duel.opponentPayout === 0n || duel.opponentClaimed)
  );
}

/** The seat `address` sits in, or null for anyone else; the zero address sits nowhere. */
export function seatOf(duel: Pick<Duel, 'creator' | 'opponent'>, address: string | null | undefined): SeatSide | null {
  const normalized = address?.toLowerCase();
  if (!normalized || normalized === ZERO_ADDRESS) return null;
  if (normalized === duel.creator.toLowerCase()) return 'creator';
  if (normalized === duel.opponent.toLowerCase()) return 'opponent';
  return null;
}

export function isDuelClaimTimedOut(claimTimestamp: bigint | number): boolean {
  const ts = typeof claimTimestamp === 'bigint' ? Number(claimTimestamp) : claimTimestamp;
  if (ts <= 0) return false;
  return Math.floor(Date.now() / 1000) >= ts + getContractConfig().claimTimeout;
}

export function isRefundableDuel(
  duel: { state: DuelState; claimTimestamp: bigint }
): boolean {
  return duel.state === DuelState.WinnerClaimed && isDuelClaimTimedOut(duel.claimTimestamp);
}

/**
 * Whether this viewer may join a waiting duel: it is still `Created`, the viewer is signed in with a
 * wallet, holds an invite the contract would admit (`_requireAdmitted`), is not the creator, and —
 * for a duel bound to one address — is that address. The duel page's Join button and the join flow
 * both ask this one function, so a return from topping up re-runs exactly the same checks. The
 * contract still decides; this only keeps the UI from offering what it would refuse.
 */
export function canJoinWaitingDuel(options: {
  duel: Pick<Duel, 'state' | 'creator' | 'inviteHash' | 'invitedOpponent'> | undefined;
  viewerAddress: string | undefined;
  authenticated: boolean;
  inviteSecret: `0x${string}` | null;
  contractAddress: `0x${string}`;
  chainId: number;
}): boolean {
  const { duel, authenticated, inviteSecret, contractAddress, chainId } = options;
  const viewer = options.viewerAddress?.toLowerCase();
  if (!duel || duel.state !== DuelState.Created || !authenticated || !viewer) return false;
  if (!canPresentInvite(inviteSecret, duel.inviteHash, contractAddress, chainId)) return false;
  if (viewer === duel.creator.toLowerCase()) return false;
  return duel.invitedOpponent === ZERO_ADDRESS || viewer === duel.invitedOpponent.toLowerCase();
}

export function truncateUnicode(value: string, maxCharacters: number): string {
  const characters = Array.from(value);
  if (characters.length <= maxCharacters) {
    return value;
  }

  return `${characters.slice(0, maxCharacters).join('')}…`;
}
