import { describe, expect, it } from 'vitest';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import { toPlayerDuel } from '@/lib/duel';
import { buildDashboardDuelSearchText, normalizeSearchQuery } from '@/lib/duelSearch';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const WINNER = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';

const won = toPlayerDuel(
  { ...duelView({ state: DuelState.Resolved, finalizedAt: 1n, creatorPayout: 1_234_500_000n }), id: 7 },
  DEFAULT_CHAIN_ID
);

function finds(language: 'en' | 'ru', query: string) {
  return buildDashboardDuelSearchText(won, WINNER, (key) => key, language, {}).includes(normalizeSearchQuery(query));
}

describe('buildDashboardDuelSearchText', () => {
  it('finds a payout waiting to be taken as the screen writes it', () => {
    expect([finds('en', '1,234.5'), finds('ru', '1 234,5')]).toEqual([true, true]);
  });

  it('finds a Russian amount typed with a plain space or no space at all', () => {
    expect([finds('ru', '1 234,5'), finds('ru', '1234,5')]).toEqual([true, true]);
  });

  it('finds a payout waiting to be taken as typed with a point, in either language', () => {
    expect([finds('en', '1234.5'), finds('ru', '1234.5')]).toEqual([true, true]);
  });
});

describe('normalizeSearchQuery', () => {
  it('folds case, spaces and a decimal comma, and trims', () => {
    expect(normalizeSearchQuery('  Won  1 234,5 ')).toBe('won 1 234.5');
  });
});
