import { DuelState, type Duel } from '@/lib/contracts';
import type { TranslationKey } from '@/i18n/translations';

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

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export type DuelOutcomeTone = 'win' | 'loss' | 'neutral';

interface DuelOutcomeSummary {
  key: TranslationKey;
  detailKey: TranslationKey;
  tone: DuelOutcomeTone;
}

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

export function hasClaimedPayoutForAddress(
  duel: Pick<ClaimableDuel, 'creator' | 'opponent' | 'creatorClaimed' | 'opponentClaimed'>,
  address?: string | null
): boolean {
  const normalized = address?.toLowerCase();
  if (!normalized) return false;

  if (normalized === duel.creator.toLowerCase()) {
    return duel.creatorClaimed;
  }

  if (normalized === duel.opponent.toLowerCase()) {
    return duel.opponentClaimed;
  }

  return false;
}

export function getCounterpartyAddress(
  duel: Pick<ClaimableDuel, 'creator' | 'opponent'>,
  address?: string | null
): string | null {
  const normalized = address?.toLowerCase();
  if (!normalized) return null;

  if (normalized === duel.creator.toLowerCase()) {
    return duel.opponent;
  }

  if (normalized === duel.opponent.toLowerCase()) {
    return duel.creator;
  }

  return null;
}

export function getDuelStateLabelKey(state: DuelState): TranslationKey {
  switch (state) {
    case DuelState.Created:
      return 'duel.waiting';
    case DuelState.Funded:
      return 'duel.inProgress';
    case DuelState.WinnerClaimed:
      return 'duel.waitingConfirm';
    case DuelState.Resolved:
      return 'duel.resolved';
    case DuelState.Refunded:
      return 'duel.refunded';
    case DuelState.Cancelled:
      return 'duel.cancelled';
    case DuelState.Declined:
      return 'duel.declined';
    case DuelState.Disputed:
      return 'duel.disputed';
    case DuelState.MutualCancelRequested:
      return 'duel.cancellationPending';
    case DuelState.MutuallyCancelled:
      return 'duel.mutuallyCancelled';
  }
}

export function getDuelOutcomeSummary(
  duel: Pick<ClaimableDuel, 'creator' | 'opponent' | 'claimedWinner' | 'state'>,
  address?: string | null
): DuelOutcomeSummary {
  const normalized = address?.toLowerCase();

  if (duel.state === DuelState.Resolved && normalized) {
    return duel.claimedWinner.toLowerCase() === normalized
      ? {
          key: 'dashboard.outcomeWon',
          detailKey: 'duel.resolved',
          tone: 'win',
        }
      : {
          key: 'dashboard.outcomeLost',
          detailKey: 'duel.resolved',
          tone: 'loss',
        };
  }

  if (
    duel.state === DuelState.Refunded
    || duel.state === DuelState.Cancelled
    || duel.state === DuelState.Declined
    || duel.state === DuelState.Disputed
    || duel.state === DuelState.MutuallyCancelled
  ) {
    return {
      key: 'dashboard.outcomeNoWinner',
      detailKey: getDuelStateLabelKey(duel.state),
      tone: 'neutral',
    };
  }

  return {
    key: getDuelStateLabelKey(duel.state),
    detailKey: getDuelStateLabelKey(duel.state),
    tone: 'neutral',
  };
}

export function matchesDuelAddressFilter(
  duel: Pick<ClaimableDuel, 'creator' | 'opponent' | 'claimedWinner' | 'claimedBy'>,
  filter: string
): boolean {
  const normalizedFilter = filter.trim().toLowerCase();
  if (!normalizedFilter) return true;

  return [
    duel.creator,
    duel.opponent,
    duel.claimedWinner,
    duel.claimedBy,
  ].some((address) => address.toLowerCase().includes(normalizedFilter));
}

export function truncateUnicode(value: string, maxCharacters: number): string {
  const characters = Array.from(value);
  if (characters.length <= maxCharacters) {
    return value;
  }

  return `${characters.slice(0, maxCharacters).join('')}…`;
}
