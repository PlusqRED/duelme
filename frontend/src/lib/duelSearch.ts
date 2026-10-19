import type { PlayerDuel } from '@/lib/duel';
import type { RecentDuel } from '@/hooks/useRecentDuels';
import type { Language, TranslationKey, TranslationParams } from '@/i18n/translations';
import { formatUnits } from 'viem';
import { USDT_DECIMALS, ZERO_ADDRESS } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import { getCategoryLabelKey } from '@/lib/game';
import { formatPublicDuelAmount, type EnrichedDuel } from '@/lib/publicDuelsFilters';
import { formatDateTime, formatUSDT } from '@/lib/utils';
import {
  getClaimableAmountForAddress,
  getCounterpartyAddress,
  getDuelOutcomeSummary,
  getDuelStateLabelKey,
  getRelevantDuelTimestamp,
  hasClaimedPayoutForAddress,
  isDuelClaimTimedOut,
} from '@/lib/duel';
import { getReputationLabelKey, type ReputationLevel } from '@/lib/reputation';

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

const CANONICAL_STATE_TERMS: Record<DuelState, string[]> = {
  // The paged readers drop `Nonexistent` records and a direct link to an id nobody issued takes
  // the not-found branch, so no screen renders one. The entry is here because the record is
  // exhaustive over the enum.
  [DuelState.Nonexistent]: [],
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

/** A comma in a number as the language writes it: Russian's decimal point, English's thousands separator. */
function foldedComma(language: Language): string {
  return language === 'ru' ? '.' : '';
}

/**
 * Search text as it is matched: lower case, ё as е the way it is often typed, any run of spaces (a
 * non-breaking one in a Russian amount too) as one space, and a comma beside a digit read the way
 * the language writes numbers. In Russian it is the decimal point, so `1 234,5` typed matches
 * `1 234,5` shown and `1234,5` matches `1234.5`; in English it groups thousands and is dropped, so
 * `1,234.5` matches `1234.5` while `1.5` does not match `1,500`. A comma with a digit on one side
 * only folds as well, in the text and in a query alike, so `1 234,` typed on the way to `1 234,5`
 * keeps matching, and so does `до 3,` typed against «до 3, без».
 */
function foldSearchText(text: string, language: Language): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/(?<=\d),|,(?=\d)/g, foldedComma(language));
}

/** A search box's query, folded the way the search text is. */
export function normalizeSearchQuery(query: string, language: Language): string {
  return foldSearchText(query.trim(), language);
}

function normalizeSearchParts(parts: Array<string | number | undefined | null | false>, language: Language) {
  return parts
    .filter((part): part is string | number => part !== undefined && part !== null && part !== false && part !== '')
    .map((part) => foldSearchText(String(part), language))
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
  reputationByAddress: Record<string, ReputationLevel>,
  nicknameByAddress?: Record<string, string | null>
) {
  const isTimedOut = duel.state === DuelState.WinnerClaimed && isDuelClaimTimedOut(duel.claimTimestamp);
  const outcome = getDuelOutcomeSummary(duel, viewerAddress, isTimedOut);
  const stateLabel = t(getDuelStateLabelKey(duel.state, isTimedOut));
  const outcomeLabel = t(outcome.key);
  const detailLabel = t(outcome.detailKey);
  const counterparty = getCounterpartyAddress(duel, viewerAddress) ?? duel.opponent;
  const claimableAmount = getClaimableAmountForAddress(duel, viewerAddress);
  const claimed = hasClaimedPayoutForAddress(duel, viewerAddress);

  return normalizeSearchParts([
    duel.id,
    duel.wager,
    `${duel.wager} usdt`,
    formatUSDT(duel.wagerAmount, language),
    duel.message,
    outcomeLabel,
    detailLabel,
    stateLabel,
    ...CANONICAL_STATE_TERMS[duel.state],
    isTimedOut ? 'timed out' : '',
    isTimedOut ? 'response timed out' : '',
    // Only for a duel still waiting: a label every duel carried would match every duel.
    duel.opponent === ZERO_ADDRESS ? t('dashboard.waitingOpponent') : '',
    counterparty,
    duel.creator,
    duel.opponent,
    duel.claimedWinner,
    duel.claimedBy,
    getReputationLabel(reputationByAddress, duel.creator, t),
    getReputationLabel(reputationByAddress, duel.opponent, t),
    nicknameByAddress?.[duel.creator.toLowerCase()] ?? '',
    nicknameByAddress?.[duel.opponent.toLowerCase()] ?? '',
    duel.chainName,
    formatDateTime(getRelevantDuelTimestamp(duel), language),
    ...(CANONICAL_OUTCOME_TERMS[outcome.key] ?? []),
    claimed ? t('dashboard.claimed') : '',
    claimed ? 'claimed' : '',
    claimableAmount > 0n ? t('dashboard.claimReady') : '',
    claimableAmount > 0n ? 'ready to claim' : '',
    claimableAmount > 0n ? 'claimable' : '',
    // As the screen writes it, and as typed: `1234.5` finds what reads `1,234.5` or `1 234,5`.
    claimableAmount > 0n ? formatUSDT(claimableAmount, language) : '',
    claimableAmount > 0n ? formatUnits(claimableAmount, USDT_DECIMALS) : '',
    claimableAmount > 0n ? t('dashboard.claimButton') : '',
  ], language);
}

export function buildRecentDuelSearchText(
  duel: RecentDuel,
  t: Translate,
  language: Language,
  reputationByAddress: Record<string, ReputationLevel>,
  nicknameByAddress?: Record<string, string | null>,
  gameName?: string | null
) {
  const isTimedOut = duel.state === DuelState.WinnerClaimed && isDuelClaimTimedOut(duel.claimTimestamp);
  const stateLabel = t(getDuelStateLabelKey(duel.state, isTimedOut));

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
    isTimedOut ? 'timed out' : '',
    isTimedOut ? 'response timed out' : '',
    duel.chainName,
    duel.state === DuelState.Resolved ? t('recent.won') : '',
    duel.state === DuelState.Resolved ? 'won' : '',
    duel.state === DuelState.Resolved ? 'winner' : '',
    formatDateTime(duel.lastEventAt, language),
    getReputationLabel(reputationByAddress, duel.player1, t),
    getReputationLabel(reputationByAddress, duel.player2, t),
    nicknameByAddress?.[duel.player1.toLowerCase()] ?? '',
    nicknameByAddress?.[duel.player2.toLowerCase()] ?? '',
    gameName ?? '',
  ], language);
}

/**
 * An open duel's search text: its creator and their level as the card names it, its stake raw, with
 * its currency and as the card writes it, the pot as the card writes it, its game and the game's
 * category.
 */
export function buildPublicDuelSearchText(duel: EnrichedDuel, t: Translate, language: Language) {
  const stats = duel.reputationStats;

  return normalizeSearchParts([
    duel.creatorName,
    duel.creator,
    duel.wager,
    `${duel.wager} usdt`,
    formatPublicDuelAmount(duel.wager, language),
    formatPublicDuelAmount(duel.wager * 2, language),
    duel.message,
    duel.gameName,
    duel.gameCategory && t(getCategoryLabelKey(duel.gameCategory)),
    stats && t(getReputationLabelKey(stats.level)),
    stats?.honored,
    stats?.total,
  ], language);
}
