// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WonDuel } from '@/hooks/useWonDuels';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';
import type { DuelMeta, Game } from '@/lib/game';

const CREATOR = '0x32a3000000000000000000000000000000aa23';
const OPPONENT = '0x4bfa0000000000000000000000000000000076a5';

const arena = vi.hoisted(() => ({
  games: [] as Game[],
  won: [] as WonDuel[],
  isLoading: false,
  askedFor: [] as (string | null)[],
}));
vi.mock('@/hooks/useGames', () => ({ useGames: () => ({ games: arena.games, isLoading: false }) }));
vi.mock('@/hooks/useWonDuels', () => ({
  useWonDuels: (slug: string | null) => {
    arena.askedFor.push(slug);
    return {
      results: arena.won.filter((duel) => slug === null || duel.game?.gameSlug === slug),
      hasAny: arena.won.length > 0,
      isLoading: arena.isLoading,
      isError: false,
      retry: vi.fn(),
    };
  },
}));
vi.mock('@/hooks/useTimeAgo', () => ({ useTimeAgo: () => () => '8d ago' }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { RecentDuels } = await import('@/components/landing/RecentDuels');

function game(slug: string, name: string, duelCount: number): Game {
  return { slug, name, iconUrl: null, category: 'MOBA', duelCount, createdAt: null, updatedAt: null };
}

function meta(duelId: number, gameSlug: string, gameName: string): DuelMeta {
  return {
    duelId,
    chainId: 421614,
    contractAddress: '0x588a54fa8c00c8ac003e41bd8ee26fbc8994105f',
    gameSlug,
    gameName,
    category: 'MOBA',
    creatorAddress: CREATOR,
    createdAt: null,
  };
}

function won(id: number, game: DuelMeta | undefined, overrides: Partial<WonDuel> = {}): WonDuel {
  return {
    id,
    creator: CREATOR,
    opponent: OPPONENT,
    creatorName: '0x32a3…AA23',
    opponentName: '0x4BFa…76a5',
    winner: 'creator',
    stake: 25_000_000n,
    note: 'go 1x1 on sf mid',
    endedAt: 1_700_000_000n,
    game,
    ...overrides,
  };
}

function row(name: RegExp) {
  return screen.getByRole('button', { name });
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  arena.games = [game('dota-2', 'Dota 2', 2), game('chess', 'Chess', 1), game('new-game', 'New Game', 0)];
  arena.won = [won(3, meta(3, 'dota-2', 'Dota 2')), won(2, meta(2, 'cs-2', 'CS 2'), { winner: 'opponent' }), won(0, meta(0, 'dota-2', 'Dota 2'))];
  arena.isLoading = false;
  arena.askedFor = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RecentDuels', () => {
  it('lists each finished duel with its game, its players, the winner and the pot', () => {
    render(<RecentDuels />);
    const first = row(/Dota 2 #3/);

    expect(within(first).getByText('won')).toBeTruthy();
    expect(within(first).getByText('“go 1x1 on sf mid”')).toBeTruthy();
    expect(first.textContent).toContain('50USDT');
    expect(first.getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the winner beside the player who won', () => {
    render(<RecentDuels />);
    const player = within(row(/CS 2 #2/)).getByText('won').parentElement;

    expect(player?.textContent).toBe('0x4BFa…76a5won');
  });

  it('opens a row into where its money went, one row at a time', () => {
    render(<RecentDuels />);

    fireEvent.click(row(/Dota 2 #3/));
    fireEvent.click(row(/CS 2 #2/));

    expect(row(/Dota 2 #3/).getAttribute('aria-expanded')).toBe('false');
    expect(row(/CS 2 #2/).getAttribute('aria-expanded')).toBe('true');
    const receipt = document.getElementById(row(/CS 2 #2/).getAttribute('aria-controls') ?? '');
    expect(receipt?.hidden).toBe(false);
    expect(within(receipt as HTMLElement).getByText('To the winner')).toBeTruthy();
    expect(within(receipt as HTMLElement).getByText('Platform fee: 0 USDT', { normalizer: (text) => text })).toBeTruthy();
    expect(within(receipt as HTMLElement).getByRole('link', { name: 'Open duel #2' }).getAttribute('href')).toBe('/duel/2');
  });

  it('offers the games that have duels as filters, most played first', () => {
    render(<RecentDuels />);
    const games = screen.getByRole('list', { name: 'Show recent duels for one game' });

    expect(within(games).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'D2Dota 2MOBA2 duels',
      'CHChessMOBA1 duel',
    ]);
  });

  it('keeps only the picked game’s duels and says which game it shows', () => {
    render(<RecentDuels />);

    fireEvent.click(screen.getByRole('button', { name: /^Dota 2 MOBA/ }));

    expect(screen.getByRole('button', { name: /^Dota 2 MOBA/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: /CS 2 #2/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /Dota 2 #/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Only Dota 2 Show all games' })).toBeTruthy();
  });

  it('shows every game again from the chip, or from the picked game itself', () => {
    render(<RecentDuels />);
    fireEvent.click(screen.getByRole('button', { name: /^Dota 2 MOBA/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Only Dota 2 Show all games' }));
    expect(screen.getAllByRole('button', { name: /#\d/ })).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /^Dota 2 MOBA/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Dota 2 MOBA/ }));
    expect(screen.getAllByRole('button', { name: /#\d/ })).toHaveLength(3);
  });

  it('says when the picked game has no finished duel yet, and points at the open ones', () => {
    render(<RecentDuels />);

    fireEvent.click(screen.getByRole('button', { name: /^Chess MOBA/ }));

    expect(screen.getByText('No finished Chess duels yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See the open duels' }).getAttribute('href')).toBe('#public-duels');
  });

  it('closes an open row that the picked game leaves out', () => {
    render(<RecentDuels />);
    fireEvent.click(row(/CS 2 #2/));
    fireEvent.click(screen.getByRole('button', { name: /^Dota 2 MOBA/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Only Dota 2 Show all games' }));

    expect(row(/CS 2 #2/).getAttribute('aria-expanded')).toBe('false');
  });

  it('says so when no duel has finished yet', () => {
    arena.won = [];
    render(<RecentDuels />);

    expect(screen.getByText('No recent duel activity yet.')).toBeTruthy();
  });

  it('grows the games’ bars the first time the list is seen', () => {
    render(<RecentDuels />);
    const games = screen.getByRole('list', { name: 'Show recent duels for one game' });
    expect(games.hasAttribute('data-pending')).toBe(true);

    act(() => FakeIntersectionObserver.watching(games).report(games, true));

    expect(games.hasAttribute('data-pending')).toBe(false);
  });
});
