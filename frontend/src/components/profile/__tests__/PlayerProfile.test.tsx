// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { Profile } from '@/lib/profile';
import { getReputationSummaryFromStats } from '@/lib/reputation';
import { truncateAddress } from '@/lib/utils';

const ADDRESS = '0x4bfa1486661d6faa5300923bd684f261ae4776a5';
const CHECKSUMMED = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';

const viewer = vi.hoisted(() => ({
  authenticated: false,
  wallet: undefined as string | undefined,
  profile: null as Profile | null,
  isLoading: false,
  reputation: { honored: 4, abandoned: 0, isLoading: false, isError: false },
  duels: { wins: 1, losses: 3, isLoading: false },
}));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: viewer.authenticated }) }));
// Without motion the figures stand at their values at once, instead of counting up once seen.
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: viewer.wallet }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: viewer.profile, isLoading: viewer.isLoading }) }));
vi.mock('@/hooks/useReputation', () => ({
  useReputation: () => {
    const { honored, abandoned, isLoading, isError } = viewer.reputation;
    return { ...getReputationSummaryFromStats(honored, abandoned), isLoading, isError };
  },
}));
vi.mock('@/hooks/usePlayerTotals', () => ({
  usePlayerTotals: () => ({
    totals: { wins: viewer.duels.wins, losses: viewer.duels.losses, stakedRaw: 55_900_000n, takenRaw: 2_600_000n },
    isLoading: viewer.duels.isLoading,
    isError: false,
    retry: vi.fn(),
  }),
}));

const { PlayerProfile } = await import('@/components/profile/PlayerProfile');

const PROFILE: Profile = {
  walletAddress: ADDRESS,
  nickname: 'alice',
  status: 'Ready for a rematch',
  aboutMe: 'Chess at night',
  games: ['Chess'],
  socialLinks: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: null,
};

const en = translations.en;

beforeEach(() => {
  Object.assign(viewer, {
    authenticated: false,
    wallet: undefined,
    profile: PROFILE,
    isLoading: false,
    reputation: { honored: 4, abandoned: 0, isLoading: false, isError: false },
    duels: { wins: 1, losses: 3, isLoading: false },
  });
});

afterEach(cleanup);

describe('PlayerProfile', () => {
  it('heads the profile with the player’s name, status and level', () => {
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.getByRole('heading', { level: 1, name: 'alice' })).toBeTruthy();
    expect(screen.getByText('Ready for a rematch')).toBeTruthy();
    expect(screen.getAllByText(en['rep.fair']).length).toBeGreaterThan(0);
  });

  it('names a player without a nickname by the address, and writes it out whole beside it', () => {
    viewer.profile = null;
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.getByRole('heading', { level: 1, name: truncateAddress(CHECKSUMMED) })).toBeTruthy();
    expect(screen.getByText(CHECKSUMMED)).toBeTruthy();
  });

  it('says a player without a profile has none', () => {
    viewer.profile = null;
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.getByText(en['profile.noProfileYet'])).toBeTruthy();
  });

  it('shows the record as a scoreboard', () => {
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.getByRole('img', { name: 'Wins 1, Losses 3' })).toBeTruthy();
    expect(screen.getByText('55.9 USDT')).toBeTruthy();
  });

  it('tallies the duels honored and abandoned', () => {
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.getByText(en['rep.try.honored']).textContent).toBe(`${en['rep.try.honored']} 4`);
  });

  it('says so when the record could not be read, rather than calling the player New', () => {
    viewer.reputation = { honored: 0, abandoned: 0, isLoading: false, isError: true };
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.getByText(en['profile.repError'])).toBeTruthy();
    expect(screen.queryByText(en['rep.new'])).toBeNull();
  });

  it('offers the owner the way to edit it', () => {
    Object.assign(viewer, { authenticated: true, wallet: ADDRESS });
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.getByRole('link', { name: en['profile.editYours'] }).getAttribute('href')).toBe('/profile');
  });

  it('offers nobody else the way to edit it', () => {
    render(<PlayerProfile address={ADDRESS} />);

    expect(screen.queryByRole('link', { name: en['profile.editYours'] })).toBeNull();
  });

  it('shows what the player wrote and the games they play', () => {
    render(<PlayerProfile address={ADDRESS} />);

    expect([screen.getByText('Chess at night'), screen.getByText('Chess')]).toHaveLength(2);
  });
});
