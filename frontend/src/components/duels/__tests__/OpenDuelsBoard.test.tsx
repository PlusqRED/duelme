// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { EnrichedDuel } from '@/lib/publicDuelsFilters';

const CREATOR = '0x32a3000000000000000000000000000000aa23';

const board = vi.hoisted(() => ({ duels: [] as EnrichedDuel[], isLoading: false }));
vi.mock('@/hooks/usePublicDuels', () => ({
  usePublicDuels: () => ({ duels: board.duels, isLoading: board.isLoading, isError: false, retry: vi.fn() }),
}));
vi.mock('@/hooks/useEnrichedPublicDuels', () => ({ useEnrichedPublicDuels: () => board.duels }));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: false }) }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: undefined }) }));
vi.mock('@/hooks/useTimeAgo', () => ({ useTimeAgo: () => () => '6d ago' }));

const { OpenDuelsBoard } = await import('@/components/duels/OpenDuelsBoard');

function duel(id: number, overrides: Partial<EnrichedDuel> = {}): EnrichedDuel {
  return {
    id,
    creator: CREATOR,
    wagerAmount: 5_000_000n,
    message: '',
    createdAt: 1_700_000_000n,
    chainId: 421614,
    gameName: 'Chess',
    gameSlug: 'chess',
    gameCategory: 'STRATEGY',
    creatorName: 'alice',
    reputationStats: undefined,
    ...overrides,
  };
}

const cards = () => screen.queryAllByRole('article');

beforeEach(() => {
  board.duels = [duel(3), duel(2, { gameName: 'Dota 2', gameSlug: 'dota-2', wagerAmount: 75_000_000n }), duel(1)];
  board.isLoading = false;
});

afterEach(cleanup);

describe('OpenDuelsBoard', () => {
  it('titles the page and says how many duels are open', () => {
    render(<OpenDuelsBoard />);

    expect(screen.getByRole('heading', { level: 1, name: 'Public duels' })).toBeTruthy();
    expect(screen.getByText('Open now: 3')).toBeTruthy();
  });

  it('offers each game as a filter with how many open duels it has', () => {
    render(<OpenDuelsBoard />);

    expect(screen.getByRole('button', { name: 'Chess 2' })).toBeTruthy();
  });

  it('keeps the open duels of the game picked', () => {
    render(<OpenDuelsBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Dota 2 1' }));

    expect(cards().map((card) => card.getAttribute('aria-labelledby'))).toEqual(['open-duel-2']);
  });

  it('keeps the open duels whose stake is in the band picked', () => {
    render(<OpenDuelsBoard />);

    fireEvent.click(screen.getByRole('button', { name: /50–100/ }));

    expect(cards()).toHaveLength(1);
  });

  it('lays a single duel out beside the invitation to make your own', () => {
    render(<OpenDuelsBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Dota 2 1' }));

    expect(screen.getByText(translations.en['publicDuels.createTitle'])).toBeTruthy();
  });

  it('says when no open duel matches, and clears the filters on request', () => {
    render(<OpenDuelsBoard />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nobody' } });

    expect(screen.getByText(translations.en['publicDuels.noMatches'])).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cards()).toHaveLength(3);
  });

  it('invites the reader to make the first duel when none is open', () => {
    board.duels = [];
    render(<OpenDuelsBoard />);

    expect(screen.getByText(translations.en['publicDuels.empty'])).toBeTruthy();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('deals eighteen cards a page', () => {
    board.duels = Array.from({ length: 20 }, (_, index) => duel(100 - index));
    render(<OpenDuelsBoard />);
    expect(cards()).toHaveLength(18);

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(cards()).toHaveLength(2);
  });
});
