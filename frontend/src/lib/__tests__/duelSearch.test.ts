import { describe, expect, it } from 'vitest';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { DuelState } from '@/lib/contracts';
import { toPlayerDuel } from '@/lib/duel';
import { buildDashboardDuelSearchText } from '@/lib/duelSearch';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const WINNER = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';

const won = toPlayerDuel(
  { ...duelView({ state: DuelState.Resolved, finalizedAt: 1n, creatorPayout: 1_234_500_000n }), id: 7 },
  DEFAULT_CHAIN_ID
);

function searchText(language: 'en' | 'ru') {
  return buildDashboardDuelSearchText(won, WINNER, (key) => key, language, {});
}

describe('buildDashboardDuelSearchText', () => {
  it('finds a payout waiting to be taken as the screen writes it', () => {
    expect([searchText('en').includes('1,234.5'), searchText('ru').includes('1 234,5')]).toEqual([true, true]);
  });

  it('finds a payout waiting to be taken as typed, in either language', () => {
    expect([searchText('en').includes('1234.5'), searchText('ru').includes('1234.5')]).toEqual([true, true]);
  });
});
