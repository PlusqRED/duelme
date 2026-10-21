import { describe, expect, it } from 'vitest';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import { toFeedDuel, toRecentDuel, type RecentDuel } from '@/lib/duelFeed';
import { buildFeedSearchText, buildPublicDuelSearchText, normalizeSearchQuery } from '@/lib/duelSearch';
import { translations, type TranslationKey } from '@/i18n/translations';
import { enrichPublicDuel } from '@/lib/publicDuelsFilters';
import { getReputationSummaryFromStats } from '@/lib/reputation';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const WINNER = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';

describe('buildPublicDuelSearchText', () => {
  // Abandoned more than honored: the card calls this creator Risky.
  const open = enrichPublicDuel({
    duel: { id: 1, creator: WINNER, wagerAmount: 500_000n, message: '', createdAt: 1n, chainId: DEFAULT_CHAIN_ID },
    meta: undefined,
    resolveDisplay: () => 'alice',
    reputationStatsByAddress: { [WINNER.toLowerCase()]: getReputationSummaryFromStats(1, 4) },
  });

  function findsOpen(language: 'en' | 'ru', query: string) {
    const t = (key: TranslationKey) => translations[language][key];
    return buildPublicDuelSearchText(open, t, language).includes(normalizeSearchQuery(query, language));
  }

  it('finds the stake as the card writes it in Russian', () => {
    expect(findsOpen('ru', '0,5')).toBe(true);
  });

  it('finds the creator by the level the card names, not by a word inside another level', () => {
    expect([findsOpen('en', 'risky'), findsOpen('en', 'reliable')]).toEqual([true, false]);
  });

  it('finds a stake typed with its currency', () => {
    expect(findsOpen('en', '0.5 usdt')).toBe(true);
  });
});

describe('normalizeSearchQuery', () => {
  it('folds case, spaces and a decimal comma, and trims', () => {
    expect(normalizeSearchQuery('  Won  1 234,5 ', 'ru')).toBe('won 1 234.5');
  });

  it('drops an English thousands comma', () => {
    expect(normalizeSearchQuery('1,234.5', 'en')).toBe('1234.5');
  });

  it('folds a comma still being typed at either end of a number', () => {
    expect([normalizeSearchQuery('1 234,', 'ru'), normalizeSearchQuery(',5', 'ru'), normalizeSearchQuery('1,', 'en')]).toEqual([
      '1 234.',
      '.5',
      '1',
    ]);
  });

  it('reads ё as е, the way it is often typed', () => {
    expect(normalizeSearchQuery('Идёт', 'ru')).toBe('идет');
  });
});

describe('buildFeedSearchText', () => {
  const OPPONENT = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb';
  const joined = toRecentDuel({
    ...duelView({ opponent: OPPONENT, state: DuelState.Funded, fundedAt: 2n, wagerAmount: 1_234_500_000n, message: 'score 1,2,3, до 3, без читов' }),
    id: 12,
  }) as RecentDuel;
  const row = toFeedDuel(joined, (address) => (address === WINNER ? 'alice' : 'bob'), {
    duelId: 12,
    chainId: DEFAULT_CHAIN_ID,
    contractAddress: '0x0000000000000000000000000000000000000001',
    gameSlug: 'chess',
    gameName: 'Chess',
    category: 'STRATEGY',
    creatorAddress: WINNER,
    createdAt: null,
  });

  function findsRow(language: 'en' | 'ru', query: string) {
    return buildFeedSearchText(row, 'In play', language).includes(normalizeSearchQuery(query, language));
  }

  it('finds a duel by its number as the row writes it', () => {
    expect(findsRow('en', '#12')).toBe(true);
  });

  it('finds a duel by its game and by either player’s name', () => {
    expect([findsRow('en', 'chess'), findsRow('en', 'alice'), findsRow('en', 'bob')]).toEqual([true, true, true]);
  });

  it('finds the pot as the row writes it in Russian', () => {
    expect(findsRow('ru', '2\u00a0469')).toBe(true);
  });

  it('finds the stake typed with a point', () => {
    expect(findsRow('en', '1234.5')).toBe(true);
  });

  it('finds the stake as the row writes it, in either language', () => {
    expect([findsRow('en', '1,234.5'), findsRow('ru', '1\u00a0234,5')]).toEqual([true, true]);
  });

  it('finds a Russian amount typed with a plain space or no space at all', () => {
    expect([findsRow('ru', '1 234,5'), findsRow('ru', '1234,5')]).toEqual([true, true]);
  });

  it('does not take an English thousands comma for a decimal point', () => {
    expect(findsRow('en', '1.23')).toBe(false);
  });

  it('folds every comma in a run of digits, not every other one', () => {
    expect(findsRow('ru', '2,3')).toBe(true);
  });

  it('finds a number typed up to the comma after it, as the text folds that comma too', () => {
    expect(findsRow('ru', 'до 3,')).toBe(true);
  });

  it('finds a duel by the state its pill names', () => {
    expect(findsRow('en', 'in play')).toBe(true);
  });

  it('does not find a duel by another game', () => {
    expect(findsRow('en', 'dota')).toBe(false);
  });
});
