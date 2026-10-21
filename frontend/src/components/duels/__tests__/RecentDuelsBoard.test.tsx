// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import type { RecentDuel } from '@/lib/duelFeed';
import type { DuelMeta, Game } from '@/lib/game';
import { duelMeta } from '@/lib/__tests__/helpers/duelMeta';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const CREATOR = '0x1111111111111111111111111111111111111111';
const OPPONENT = '0x2222222222222222222222222222222222222222';

const arena = vi.hoisted(() => ({ duels: [] as RecentDuel[], metas: {} as Record<number, DuelMeta>, games: [] as Game[] }));
vi.mock('@/hooks/useRecentDuels', () => ({
  useRecentDuels: () => ({ duels: arena.duels, isLoading: false, isError: false, retry: vi.fn() }),
}));
vi.mock('@/hooks/useDuelMetas', () => ({ useDuelMetas: () => ({ metaByDuelId: arena.metas }) }));
vi.mock('@/hooks/useNicknames', () => ({
  useNicknames: () => ({ resolveDisplay: (address: string) => (address === CREATOR ? 'alice' : 'bob') }),
}));
vi.mock('@/hooks/useGames', () => ({ useGames: () => ({ games: arena.games, isLoading: false }) }));
vi.mock('@/hooks/useTimeAgo', () => ({ useTimeAgo: () => () => '2d ago' }));

const { RecentDuelsBoard } = await import('@/components/duels/RecentDuelsBoard');

function duel(id: number, state: DuelState): RecentDuel {
  return {
    id,
    player1: CREATOR,
    player2: OPPONENT,
    wagerAmount: 5_000_000n,
    message: '',
    winner: CREATOR,
    lastEventAt: BigInt(1_700_000_000 + id),
    claimTimestamp: 0n,
    state,
    creatorPayout: 10_000_000n,
    opponentPayout: 0n,
    creatorClaimed: false,
    opponentClaimed: false,
  };
}

const rows = () => screen.queryAllByRole('button', { name: /#\d/ });

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  arena.duels = [duel(3, DuelState.Resolved), duel(2, DuelState.Funded)];
  arena.metas = { 3: duelMeta(3, 'dota-2', { gameName: 'Dota 2' }), 2: duelMeta(2, 'chess', { gameName: 'Chess' }) };
  arena.games = [
    { slug: 'dota-2', name: 'Dota 2', iconUrl: null, category: 'MOBA', duelCount: 1, createdAt: null, updatedAt: null },
    { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 1, createdAt: null, updatedAt: null },
  ];
  window.history.replaceState(null, '', '/duels/recent');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RecentDuelsBoard', () => {
  it('lists every joined duel, in play or won', () => {
    render(<RecentDuelsBoard initialQuery="" />);

    expect(rows()).toHaveLength(2);
  });

  it('opens with the search the address came with', () => {
    render(<RecentDuelsBoard initialQuery="chess" />);

    expect([(screen.getByRole('searchbox') as HTMLInputElement).value, rows().length]).toEqual(['chess', 1]);
  });

  it('keeps the duels of the popular game picked', () => {
    render(<RecentDuelsBoard initialQuery="" />);

    fireEvent.click(screen.getByRole('button', { name: /^Dota 2 MOBA/ }));

    expect(rows().map((row) => row.textContent?.match(/#\d/)?.[0])).toEqual(['#3']);
  });

  it('points at the open duels while nobody has joined one', () => {
    arena.duels = [];
    render(<RecentDuelsBoard initialQuery="" />);

    expect(screen.getByRole('link', { name: 'See the open duels' }).getAttribute('href')).toBe('/duels/public');
  });
});
