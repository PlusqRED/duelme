import type { Duel } from '@/lib/contracts';

type ClaimableDuel = Pick<
  Duel,
  | 'creator'
  | 'opponent'
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

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function getClaimableAmountForAddress(
  duel: Pick<ClaimableDuel, 'creator' | 'opponent' | 'creatorPayout' | 'opponentPayout' | 'creatorClaimed' | 'opponentClaimed'>,
  address?: string | null
): bigint {
  const normalized = address?.toLowerCase();
  if (!normalized) return 0n;

  if (normalized === duel.creator.toLowerCase()) {
    return duel.creatorClaimed ? 0n : duel.creatorPayout;
  }

  if (normalized === duel.opponent.toLowerCase()) {
    return duel.opponentClaimed ? 0n : duel.opponentPayout;
  }

  return 0n;
}

export function getRelevantDuelTimestamp(duel: ClaimableDuel): bigint {
  if (duel.finalizedAt > 0n) return duel.finalizedAt;
  if (duel.cancelRequestedAt > 0n) return duel.cancelRequestedAt;
  if (duel.claimTimestamp > 0n) return duel.claimTimestamp;
  if (duel.fundedAt > 0n) return duel.fundedAt;
  return duel.createdAt;
}
