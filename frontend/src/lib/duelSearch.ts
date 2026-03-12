import type { PlayerDuel } from '@/hooks/usePlayerDuels';
import type { RecentDuel } from '@/hooks/useRecentDuels';
import type { Language, TranslationKey, TranslationParams } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import { formatDateTime, formatUSDT } from '@/lib/utils';
import {
  getClaimableAmountForAddress,
  getCounterpartyAddress,
  getDuelOutcomeSummary,
  getDuelStateLabelKey,
  getRelevantDuelTimestamp,
  hasClaimedPayoutForAddress,
} from '@/lib/duel';
import { getReputationLabelKey, type ReputationLevel } from '@/lib/reputation';

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

const CANONICAL_STATE_TERMS: Record<DuelState, string[]> = {
  [DuelState.Created]: ['waiting for opponent', 'created'],
  [DuelState.Funded]: ['in progress', 'funded', 'live'],
  [DuelState.WinnerClaimed]: ['waiting for confirmation', 'result submitted'],
  [DuelState.Resolved]: ['resolved', 'duel resolved'],
  [DuelState.Refunded]: ['refunded', 'refund unlocked'],
  [DuelState.Cancelled]: ['cancelled', 'canceled'],
  [DuelState.Declined]: ['declined', 'invite declined'],
  [DuelState.Disputed]: ['disputed', 'result disputed'],
  [DuelState.MutualCancelRequested]: ['cancellation requested', 'mutual cancel requested'],
  [DuelState.MutuallyCancelled]: ['cancelled by agreement', 'mutually cancelled', 'mutually canceled'],
};

const CANONICAL_OUTCOME_TERMS: Record<string, string[]> = {
  'dashboard.outcomeWon': ['won', 'victory', 'winner'],
  'dashboard.outcomeLost': ['lost', 'defeat', 'loser'],
  'dashboard.outcomeNoWinner': ['no winner', 'refund', 'draw'],
};

function normalizeSearchParts(parts: Array<string | number | undefined | null | false>) {
  return parts
    .filter((part): part is string | number => part !== undefined && part !== null && part !== false && part !== '')
    .map((part) => String(part).toLowerCase())
    .join(' ');
}

function getReputationLabel(
  reputationByAddress: Record<string, ReputationLevel>,
  address: string,
  t: Translate
) {
  const level = reputationByAddress[address.toLowerCase()];
  return level ? t(getReputationLabelKey(level)) : '';
}

export function buildDashboardDuelSearchText(
  duel: PlayerDuel,
  viewerAddress: string | undefined,
  t: Translate,
  language: Language,
  reputationByAddress: Record<string, ReputationLevel>
) {
  const outcome = getDuelOutcomeSummary(duel, viewerAddress);
  const stateLabel = t(getDuelStateLabelKey(duel.state));
  const outcomeLabel = t(outcome.key);
  const detailLabel = t(outcome.detailKey);
  const counterparty = getCounterpartyAddress(duel, viewerAddress) ?? duel.opponent;
  const claimableAmount = getClaimableAmountForAddress(duel, viewerAddress);
  const claimed = hasClaimedPayoutForAddress(duel, viewerAddress);

  return normalizeSearchParts([
    duel.id,
    duel.wager,
    `${duel.wager} usdt`,
    duel.message,
    outcomeLabel,
    detailLabel,
    stateLabel,
    ...CANONICAL_STATE_TERMS[duel.state],
    t('dashboard.opponentLabel'),
    t('dashboard.waitingOpponent'),
    counterparty,
    duel.creator,
    duel.opponent,
    duel.claimedWinner,
    duel.claimedBy,
    getReputationLabel(reputationByAddress, duel.creator, t),
    getReputationLabel(reputationByAddress, duel.opponent, t),
    duel.chainName,
    'arbitrum sepolia',
    'arb sepolia',
    formatDateTime(getRelevantDuelTimestamp(duel), language),
    t('dashboard.lastUpdateLabel'),
    ...(CANONICAL_OUTCOME_TERMS[outcome.key] ?? []),
    claimed ? t('dashboard.claimed') : '',
    claimed ? 'claimed' : '',
    claimableAmount > 0n ? t('dashboard.claimReady') : '',
    claimableAmount > 0n ? 'ready to claim' : '',
    claimableAmount > 0n ? 'claimable' : '',
    claimableAmount > 0n ? formatUSDT(claimableAmount) : '',
    claimableAmount > 0n ? t('dashboard.claimButton', { amount: formatUSDT(claimableAmount) }) : '',
  ]);
}

export function buildRecentDuelSearchText(
  duel: RecentDuel,
  t: Translate,
  language: Language,
  reputationByAddress: Record<string, ReputationLevel>
) {
  const stateLabel = t(getDuelStateLabelKey(duel.state));

  return normalizeSearchParts([
    duel.id,
    duel.wager,
    `${duel.wager} usdt`,
    duel.message,
    duel.player1,
    duel.player2,
    duel.winner,
    stateLabel,
    ...CANONICAL_STATE_TERMS[duel.state],
    duel.chainName,
    'arbitrum sepolia',
    'arb sepolia',
    duel.state === DuelState.Resolved ? t('recent.won') : '',
    duel.state === DuelState.Resolved ? 'won' : '',
    duel.state === DuelState.Resolved ? 'winner' : '',
    formatDateTime(duel.lastEventAt, language),
    t('recent.updated'),
    getReputationLabel(reputationByAddress, duel.player1, t),
    getReputationLabel(reputationByAddress, duel.player2, t),
  ]);
}
