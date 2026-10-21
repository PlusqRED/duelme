// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import type { RecentDuel } from '@/lib/duelFeed';
import { duelMeta } from '@/lib/__tests__/helpers/duelMeta';

const CREATOR = '0x1111111111111111111111111111111111111111';
const OPPONENT = '0x2222222222222222222222222222222222222222';

const names = vi.hoisted(() => ({ askedFor: [] as string[] }));
vi.mock('@/hooks/useNicknames', () => ({
  useNicknames: (addresses: string[]) => {
    names.askedFor = addresses;
    return { resolveDisplay: (address: string) => (address === CREATOR ? 'alice' : 'bob') };
  },
}));

const { useFeedDuels } = await import('@/hooks/useFeedDuels');

const DUEL: RecentDuel = {
  id: 4,
  player1: CREATOR,
  player2: OPPONENT,
  wagerAmount: 5_000_000n,
  message: '',
  winner: CREATOR,
  lastEventAt: 1n,
  claimTimestamp: 0n,
  state: DuelState.Funded,
  creatorPayout: 0n,
  opponentPayout: 0n,
  creatorClaimed: false,
  opponentClaimed: false,
};

afterEach(cleanup);

describe('useFeedDuels', () => {
  it('names both players and gives each duel its game from the metadata', () => {
    const { result } = renderHook(() => useFeedDuels([DUEL], { 4: duelMeta(4, 'chess') }));

    expect(result.current).toEqual([{ ...DUEL, creatorName: 'alice', opponentName: 'bob', game: duelMeta(4, 'chess') }]);
  });

  it('looks up the names of both players of every duel', () => {
    renderHook(() => useFeedDuels([DUEL], {}));

    expect(names.askedFor).toEqual([CREATOR, OPPONENT]);
  });

  it('leaves the game out of a duel the metadata does not know', () => {
    const { result } = renderHook(() => useFeedDuels([DUEL], {}));

    expect(result.current[0].game).toBeUndefined();
  });
});
