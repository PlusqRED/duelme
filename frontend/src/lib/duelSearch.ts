import type { Language, TranslationKey, TranslationParams } from '@/i18n/translations';
import { formatUnits } from 'viem';
import { USDT_DECIMALS } from '@/lib/constants';
import { getCategoryLabelKey } from '@/lib/game';
import type { FeedDuel } from '@/lib/duelFeed';
import type { EnrichedDuel } from '@/lib/publicDuelsFilters';
import { formatUSDT } from '@/lib/utils';
import { getReputationLabelKey } from '@/lib/reputation';

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

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

/**
 * A feed row's search text: what the row shows, its number, game, players by name and address, note,
 * stake and pot as the row writes them, the stake as typed with its currency, and its state as its
 * pill names it.
 */
export function buildFeedSearchText(duel: FeedDuel, stateLabel: string, language: Language) {
  return normalizeSearchParts([
    `#${duel.id}`,
    duel.game?.gameName,
    duel.creatorName,
    duel.opponentName,
    duel.player1,
    duel.player2,
    duel.message,
    formatUSDT(duel.wagerAmount, language),
    formatUSDT(duel.wagerAmount * 2n, language),
    `${formatUnits(duel.wagerAmount, USDT_DECIMALS)} usdt`,
    stateLabel,
  ], language);
}

/**
 * An open duel's search text: its creator and their level as the card names it, its stake as typed
 * with its currency and as the card writes it, the pot as the card writes it, its game and the
 * game's category.
 */
export function buildPublicDuelSearchText(duel: EnrichedDuel, t: Translate, language: Language) {
  const stats = duel.reputationStats;

  return normalizeSearchParts([
    duel.creatorName,
    duel.creator,
    `${formatUnits(duel.wagerAmount, USDT_DECIMALS)} usdt`,
    formatUSDT(duel.wagerAmount, language),
    formatUSDT(duel.wagerAmount * 2n, language),
    duel.message,
    duel.gameName,
    duel.gameCategory && t(getCategoryLabelKey(duel.gameCategory)),
    stats && t(getReputationLabelKey(stats.level)),
    stats?.honored,
    stats?.total,
  ], language);
}
