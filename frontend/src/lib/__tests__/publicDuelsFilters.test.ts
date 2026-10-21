import { describe, expect, it } from 'vitest';
import { DuelState } from '@/lib/contracts';
import {
  filterOpenDuels,
  NO_GAME,
  openDuelGames,
  openPublicDuelsOf,
  stakeBandOf,
  type EnrichedDuel,
} from '@/lib/publicDuelsFilters';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const CHAIN_ID = 421614;
const INVITED = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb';

function open(id: number, overrides: Partial<EnrichedDuel> = {}): EnrichedDuel {
  return {
    id,
    creator: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
    wagerAmount: 5_000_000n,
    message: '',
    createdAt: 1n,
    chainId: CHAIN_ID,
    gameName: 'Chess',
    gameSlug: 'chess',
    gameCategory: 'STRATEGY',
    creatorName: 'alice',
    reputationStats: undefined,
    ...overrides,
  };
}

const ANY = { game: null, stake: null, normalizedQuery: '' };

describe('openPublicDuelsOf', () => {
  it('lists the duels anybody may join, newest first', () => {
    const records = [{ ...duelView(), id: 1 }, { ...duelView(), id: 4 }];

    expect(openPublicDuelsOf(records, CHAIN_ID).map((duel) => duel.id)).toEqual([4, 1]);
  });

  it('leaves out a duel addressed to one player', () => {
    expect(openPublicDuelsOf([{ ...duelView({ invitedOpponent: INVITED }), id: 1 }], CHAIN_ID)).toEqual([]);
  });

  it('leaves out a duel someone already joined', () => {
    expect(openPublicDuelsOf([{ ...duelView({ state: DuelState.Funded }), id: 1 }], CHAIN_ID)).toEqual([]);
  });

  it('leaves out a private duel', () => {
    expect(openPublicDuelsOf([{ ...duelView({ inviteHash: `0x${'1'.repeat(64)}` }), id: 1 }], CHAIN_ID)).toEqual([]);
  });
});

describe('stakeBandOf', () => {
  it('puts a stake under 10 in the first band', () => {
    expect(stakeBandOf(9_999_999n)).toBe('under10');
  });

  it('puts 10 and 50 in the band that ends at 50', () => {
    expect([stakeBandOf(10_000_000n), stakeBandOf(50_000_000n)]).toEqual(['10to50', '10to50']);
  });

  it('puts 100 in the band that ends at 100', () => {
    expect(stakeBandOf(100_000_000n)).toBe('50to100');
  });

  it('puts anything above 100 in the last band', () => {
    expect(stakeBandOf(100_000_001n)).toBe('over100');
  });
});

describe('filterOpenDuels', () => {
  const duels = [open(1), open(2, { gameSlug: 'dota-2', wagerAmount: 75_000_000n }), open(3, { gameSlug: null, gameName: null })];

  it('keeps the duels of the picked game', () => {
    expect(filterOpenDuels(duels, { ...ANY, game: 'dota-2' }, new Map()).map((duel) => duel.id)).toEqual([2]);
  });

  it('keeps the duels created without a game under their own filter', () => {
    expect(filterOpenDuels(duels, { ...ANY, game: NO_GAME }, new Map()).map((duel) => duel.id)).toEqual([3]);
  });

  it('keeps the duels whose stake is in the picked band', () => {
    expect(filterOpenDuels(duels, { ...ANY, stake: '50to100' }, new Map()).map((duel) => duel.id)).toEqual([2]);
  });

  it('keeps the duels whose text holds the search', () => {
    const textById = new Map([[1, 'alice chess'], [2, 'bob dota'], [3, 'carol']]);

    expect(filterOpenDuels(duels, { ...ANY, normalizedQuery: 'bob' }, textById).map((duel) => duel.id)).toEqual([2]);
  });
});

describe('openDuelGames', () => {
  it('counts the open duels of each game, the most first and those without a game last', () => {
    const duels = [open(1, { gameSlug: null, gameName: null, gameCategory: null }), open(2), open(3, { gameSlug: 'dota-2', gameName: 'Dota 2' }), open(4)];

    expect(openDuelGames(duels).map((game) => [game.slug, game.count])).toEqual([
      ['chess', 2],
      ['dota-2', 1],
      [NO_GAME, 1],
    ]);
  });
});
