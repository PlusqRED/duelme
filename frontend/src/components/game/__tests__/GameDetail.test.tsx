// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import type { DuelRecord } from '@/lib/duel';
import type { DuelMeta, Game } from '@/lib/game';
import type { EnrichedDuel, PublicDuel } from '@/lib/publicDuelsFilters';
import { duelMeta } from '@/lib/__tests__/helpers/duelMeta';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const OPPONENT = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb';
const CHESS: Game = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 2, createdAt: null, updatedAt: null };

const page = vi.hoisted(() => ({
  game: null as Game | null,
  isGameLoading: false,
  isGameError: false,
  refetch: vi.fn(),
  records: [] as DuelRecord[],
  metas: {} as Record<number, DuelMeta>,
}));
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ game: page.game, isLoading: page.isGameLoading, isError: page.isGameError, refetch: page.refetch }),
}));
vi.mock('@/hooks/useGameDuels', () => ({
  useGameDuels: () => ({
    duels: page.records,
    metaByDuelId: page.metas,
    totalVolume: 10_000_000n,
    duelsPlayed: 1,
    isLoading: false,
    isError: false,
    retry: vi.fn(),
  }),
}));
vi.mock('@/hooks/useEnrichedPublicDuels', () => ({
  useEnrichedPublicDuels: (duels: PublicDuel[]): EnrichedDuel[] =>
    duels.map((duel) => ({ ...duel, gameName: 'Chess', gameSlug: 'chess', gameCategory: 'STRATEGY', creatorName: 'alice', reputationStats: undefined })),
}));
vi.mock('@/hooks/useNicknames', () => ({ useNicknames: () => ({ resolveDisplay: () => 'alice' }) }));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: false }) }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: undefined }) }));
vi.mock('@/hooks/useTimeAgo', () => ({ useTimeAgo: () => () => '2d ago' }));

const { GameDetail } = await import('@/components/game/GameDetail');

beforeEach(() => {
  Object.assign(page, { game: CHESS, isGameLoading: false, isGameError: false, records: [], metas: {} });
  page.refetch.mockClear();
});

afterEach(cleanup);

describe('GameDetail', () => {
  it('heads the page with the game, its category and the money it has seen', () => {
    render(<GameDetail slug="chess" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Chess' })).toBeTruthy();
    expect(screen.getByText('Strategy')).toBeTruthy();
    expect(screen.getByText('10.00 USDT')).toBeTruthy();
  });

  it('lists the game’s open duels and the duels someone joined in it', () => {
    page.records = [
      { ...duelView(), id: 5 },
      { ...duelView({ opponent: OPPONENT, state: DuelState.Funded, fundedAt: 2n }), id: 4 },
    ];
    page.metas = { 4: duelMeta(4, 'chess', { gameName: 'Chess' }) };
    render(<GameDetail slug="chess" />);

    expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-labelledby'))).toEqual(['open-duel-5']);
    expect(screen.getByRole('button', { name: /Chess #4/ })).toBeTruthy();
  });

  it('offers to open a duel when nobody waits in the game', () => {
    render(<GameDetail slug="chess" />);

    expect(screen.getByText('Nobody is waiting in Chess right now')).toBeTruthy();
  });

  it('says nobody has played the game yet', () => {
    render(<GameDetail slug="chess" />);

    expect(screen.getByText('Nobody has played a duel in Chess yet.')).toBeTruthy();
  });

  it('says the catalog has no such game, and leads back to it', () => {
    page.game = null;
    render(<GameDetail slug="zork" />);

    expect(screen.getByRole('heading', { level: 1, name: translations.en['game.notFound'] })).toBeTruthy();
    expect(screen.getByRole('link', { name: translations.en['popularGames.viewAll'] }).getAttribute('href')).toBe('/games');
  });

  it('tells a failed read from a missing game, and reads it again on request', () => {
    Object.assign(page, { game: null, isGameError: true });
    render(<GameDetail slug="chess" />);

    fireEvent.click(screen.getByRole('button', { name: translations.en['action.tryAgain'] }));

    expect(screen.getByRole('heading', { level: 1, name: translations.en['error.title'] })).toBeTruthy();
    expect(page.refetch).toHaveBeenCalledOnce();
  });
});
