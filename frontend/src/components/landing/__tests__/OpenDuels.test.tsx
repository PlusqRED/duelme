// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnrichedDuel } from '@/lib/publicDuelsFilters';

const CREATOR = '0x32a3000000000000000000000000000000aa23';

const page = vi.hoisted(() => ({
  duels: [] as EnrichedDuel[],
  total: 0,
  isLoading: false,
  authenticated: false,
  wallet: undefined as string | undefined,
}));
vi.mock('@/hooks/useOpenDuels', () => ({
  useOpenDuels: () => ({ duels: page.duels, total: page.total, isLoading: page.isLoading, isError: false, retry: vi.fn() }),
}));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: page.authenticated }) }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: page.wallet }) }));
vi.mock('@/hooks/useTimeAgo', () => ({ useTimeAgo: () => () => '6d ago' }));

const { OpenDuels } = await import('@/components/landing/OpenDuels');

function duel(id: number, overrides: Partial<EnrichedDuel> = {}): EnrichedDuel {
  return {
    id,
    creator: CREATOR,
    wagerAmount: 14_500_000n,
    message: 'go 1x1 on pals in valley',
    createdAt: 1_700_000_000n,
    chainId: 421614,
    gameName: 'Wow Midnight',
    gameSlug: 'wow-midnight',
    gameCategory: 'OTHER',
    creatorName: '0x32a3…AA23',
    reputationStats: { level: 'fair', honored: 4, abandoned: 0, total: 4, score: 0.5 },
    ...overrides,
  };
}

function card(name: string) {
  return screen.getByRole('article', { name });
}

beforeEach(() => {
  Object.assign(page, { duels: [], total: 0, isLoading: false, authenticated: false, wallet: undefined });
});

afterEach(cleanup);

describe('OpenDuels', () => {
  it('lays one open duel out as a table, with its game, note, creator, record and price', () => {
    page.duels = [duel(7)];
    page.total = 1;
    render(<OpenDuels />);
    const table = card('Wow Midnight');

    expect(within(table).getByText('go 1x1 on pals in valley')).toBeTruthy();
    expect(within(table).getByText('Mixed')).toBeTruthy();
    expect(within(table).getByText('4/4 honored')).toBeTruthy();
    expect(within(table).getByText('Open opponent slot')).toBeTruthy();
    expect([...table.querySelectorAll('dd')].map((amount) => amount.textContent)).toEqual(['14.5USDT', '29USDT']);
    expect(within(table).getByRole('link', { name: 'Join for 14.5 USDT' }).getAttribute('href')).toBe('/duel/7');
  });

  it('names no level for a creator whose record could not be read', () => {
    page.duels = [duel(7, { reputationStats: undefined })];
    page.total = 1;
    render(<OpenDuels />);
    const table = card('Wow Midnight');

    expect(within(table).queryByText('New')).toBeNull();
    expect(within(table).queryByText('No duel history')).toBeNull();
  });

  it('counts every open duel beside the title', () => {
    page.duels = [duel(7)];
    page.total = 9;
    render(<OpenDuels />);

    expect(screen.getByText('Open now: 9')).toBeTruthy();
  });

  it('invites to make a duel on other terms beside a single one', () => {
    page.duels = [duel(7)];
    page.total = 1;
    render(<OpenDuels />);

    expect(screen.getByRole('heading', { name: 'Want different terms?' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create a duel' }).getAttribute('href')).toBe('/duel/create');
  });

  it('says there are none, with no count, when no duel is open', () => {
    render(<OpenDuels />);

    expect(screen.getByRole('heading', { name: 'No public duels right now. Create one!' })).toBeTruthy();
    expect(screen.queryByText(/Open now/)).toBeNull();
  });

  it('makes two or more a lobby of compact cards with an open seat each', () => {
    page.duels = [duel(7), duel(6, { gameName: 'Chess', gameCategory: 'STRATEGY' })];
    page.total = 2;
    render(<OpenDuels />);

    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getAllByText('Open seat')).toHaveLength(2);
    expect(screen.queryByText('Open opponent slot')).toBeNull();
  });

  it('opens the reader’s own duel rather than joining it', () => {
    page.duels = [duel(7)];
    page.authenticated = true;
    page.wallet = CREATOR;
    render(<OpenDuels />);

    expect(within(card('Wow Midnight')).getByRole('link', { name: 'View Duel' })).toBeTruthy();
  });

  it('opens rather than joins while a signed-in reader’s wallet is not known yet', () => {
    page.duels = [duel(7)];
    page.authenticated = true;
    render(<OpenDuels />);

    expect(within(card('Wow Midnight')).getByRole('link', { name: 'View Duel' })).toBeTruthy();
  });

  it('names a duel created without a game as such, and leaves out a note that is only blanks', () => {
    page.duels = [duel(7, { gameName: null, gameSlug: null, gameCategory: null, message: '   ' })];
    render(<OpenDuels />);
    const table = card('No game');

    expect([...table.querySelectorAll('p')].filter((line) => !line.textContent?.trim())).toEqual([]);
  });

  it('shows no cards while the open duels are read', () => {
    page.isLoading = true;
    render(<OpenDuels />);

    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.queryByRole('heading', { name: /Create one/ })).toBeNull();
  });
});
