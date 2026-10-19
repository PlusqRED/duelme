import { describe, expect, it } from 'vitest';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import { toPlayerDuel } from '@/lib/duel';
import { buildDashboardDuelSearchText, buildPublicDuelSearchText, normalizeSearchQuery } from '@/lib/duelSearch';
import { translations, type TranslationKey } from '@/i18n/translations';
import { enrichPublicDuel } from '@/lib/publicDuelsFilters';
import { getReputationSummaryFromStats } from '@/lib/reputation';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const WINNER = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';

const won = toPlayerDuel(
  {
    ...duelView({
      state: DuelState.Resolved,
      finalizedAt: 1n,
      wagerAmount: 2_345_600_000n,
      creatorPayout: 1_234_500_000n,
      message: 'score 1,2,3',
    }),
    id: 7,
  },
  DEFAULT_CHAIN_ID
);

function finds(language: 'en' | 'ru', query: string) {
  return buildDashboardDuelSearchText(won, WINNER, (key) => key, language, {}).includes(
    normalizeSearchQuery(query, language)
  );
}

describe('buildDashboardDuelSearchText', () => {
  it('finds a payout waiting to be taken as the screen writes it', () => {
    expect([finds('en', '1,234.5'), finds('ru', '1\u00a0234,5')]).toEqual([true, true]);
  });

  it('finds a Russian amount typed with a plain space or no space at all', () => {
    expect([finds('ru', '1 234,5'), finds('ru', '1234,5')]).toEqual([true, true]);
  });

  it('finds a payout waiting to be taken as typed with a point, in either language', () => {
    expect([finds('en', '1234.5'), finds('ru', '1234.5')]).toEqual([true, true]);
  });

  it('finds the stake as the card writes it, in either language', () => {
    expect([finds('en', '2,345.6'), finds('ru', '2\u00a0345,6')]).toEqual([true, true]);
  });

  it('does not take an English thousands comma for a decimal point', () => {
    expect(finds('en', '1.23')).toBe(false);
  });

  it('folds every comma in a run of digits, not every other one', () => {
    expect(finds('ru', '2,3')).toBe(true);
  });
});

describe('buildPublicDuelSearchText', () => {
  // Abandoned more than honored: the card calls this creator Risky.
  const open = enrichPublicDuel({
    duel: { id: 1, creator: WINNER, wager: 0.5, message: '', createdAt: 1n, chainId: DEFAULT_CHAIN_ID },
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
