// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState } from '@/lib/contracts';
import type { MyDuel, MyTotals } from '@/lib/dashboard';
import { summarizeOwed, type Owed } from '@/lib/owed';
import { DASH_NOW, myDuel, READER, RIVAL } from '@/lib/__tests__/helpers/myDuel';

const TOTALS: MyTotals = { wins: 0, losses: 0, stakedRaw: 0n, takenRaw: 0n };

const env = vi.hoisted(() => ({
  ready: true,
  authenticated: true,
  login: vi.fn(),
  hasWallet: true,
  isLoading: false,
  isError: false,
  yours: [] as MyDuel[],
  theirs: [] as MyDuel[],
  past: [] as MyDuel[],
  owed: null as Owed | null,
  takenRaw: null as bigint | null,
  retry: vi.fn(),
}));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ ready: env.ready, authenticated: env.authenticated, login: env.login }) }));
vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () =>
    env.hasWallet ? { activeWallet: { address: READER }, walletAddress: READER.toLowerCase() } : { activeWallet: undefined, walletAddress: undefined },
}));
vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({
    yours: env.yours,
    theirs: env.theirs,
    past: env.past,
    owed: env.owed,
    totals: TOTALS,
    entryById: new Map([...env.yours, ...env.theirs, ...env.past].map((entry) => [entry.duel.id, entry])),
    claimTimeout: 86_400,
    hasDuels: env.yours.length + env.theirs.length + env.past.length > 0,
    gameOf: () => null,
    nameOf: (address: string) => address,
    isLoading: env.isLoading,
    isError: env.isError,
    refetch: vi.fn(),
    retry: env.retry,
  }),
}));
vi.mock('@/hooks/useDashboardTake', () => ({
  useDashboardTake: (owed: Owed | null) => ({ owed, takenRaw: env.takenRaw, take: vi.fn(), actionFlow: { flow: null } }),
}));
// The signing window is the old one until the integration swaps it; it has its own tests.
vi.mock('@/components/dashboard/TakeFlowDialog', () => ({ TakeFlowDialog: () => null }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useReputation', () => ({ useReputation: () => ({ honored: 0, abandoned: 0, isLoading: false, isError: false }) }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: true, forwarderAddress: undefined }) }));
vi.mock('@/hooks/useNicknames', () => ({ useNicknames: () => ({ resolveDisplay: (address: string) => address }) }));
vi.mock('@/hooks/useReputationLevels', () => ({ useReputationLevels: () => ({ reputationStatsByAddress: {} }) }));

const { Dashboard } = await import('@/components/dashboard/Dashboard');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DASH_NOW * 1000);
  Object.assign(env, {
    ready: true,
    authenticated: true,
    hasWallet: true,
    isLoading: false,
    isError: false,
    yours: [],
    theirs: [],
    past: [],
    owed: null,
    takenRaw: null,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('Dashboard', () => {
  it('invites a guest to sign in, beside the public duels', () => {
    env.authenticated = false;
    env.hasWallet = false;
    render(<Dashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('heading', { name: 'Sign in to see your duels' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Public duels' }).getAttribute('href')).toBe('/duels/public');
    expect(env.login).toHaveBeenCalledOnce();
  });

  it('says the duels are being read while they are', () => {
    env.isLoading = true;

    render(<Dashboard />);

    expect(screen.getByRole('status').textContent).toBe('Reading your duels from the contract…');
  });

  it('waits for the wallet of a player who signed in', () => {
    env.hasWallet = false;

    render(<Dashboard />);

    expect(screen.getByRole('status').textContent).toBe('Reading your duels from the contract…');
    expect(screen.queryByRole('heading', { name: 'Sign in to see your duels' })).toBeNull();
  });

  it('invites a wallet with no duels to create one, with its card beside', () => {
    render(<Dashboard />);

    expect(screen.getByRole('heading', { name: 'No duels yet' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create a duel' }).getAttribute('href')).toBe('/duel/create');
    expect(screen.getByRole('heading', { name: '0x4BFa...76a5' })).toBeTruthy();
  });

  it('groups the duels on by whose move it is, then the history', () => {
    env.yours = [myDuel(1)];
    env.theirs = [myDuel(2, { state: DuelState.Created, opponent: '0x0000000000000000000000000000000000000000' })];
    env.past = [myDuel(3, { state: DuelState.Resolved, claimedWinner: READER })];

    render(<Dashboard />);

    const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(titles.slice(0, 3)).toEqual(['Your move1', 'Waiting1', 'History1']);
  });

  it('leaves out a group with no duels', () => {
    env.theirs = [myDuel(2, { state: DuelState.Created, opponent: '0x0000000000000000000000000000000000000000' })];

    render(<Dashboard />);

    expect(screen.queryByRole('heading', { name: /Your move/ })).toBeNull();
  });

  it('puts the money waiting first, as the safe', () => {
    env.past = [myDuel(3, { state: DuelState.Resolved, claimedWinner: READER })];
    env.owed = summarizeOwed([{ duelId: 3, seat: 'creator', kind: 'win', raw: 10_000_000n }]);

    render(<Dashboard />);

    expect(screen.getAllByRole('heading', { level: 2 })[0].textContent).toBe('Waiting for you in the contract');
  });

  it('says what was taken once the safe is empty', () => {
    env.past = [myDuel(3, { state: DuelState.Resolved, claimedWinner: READER })];
    env.takenRaw = 10_000_000n;

    render(<Dashboard />);

    expect(screen.getByText('10 USDT taken: it’s in your wallet now.')).toBeTruthy();
  });

  it('says part of the history did not load, and reads it again', () => {
    env.isError = true;
    env.past = [myDuel(3, { state: DuelState.Resolved, claimedWinner: RIVAL })];
    render(<Dashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Not every duel loaded, so this list may be incomplete or out of date.')).toBeTruthy();
    expect(env.retry).toHaveBeenCalledOnce();
  });
});
