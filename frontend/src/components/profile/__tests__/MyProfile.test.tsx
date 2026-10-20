// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { getReputationSummaryFromStats } from '@/lib/reputation';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';

const session = vi.hoisted(() => ({ ready: true, authenticated: false, login: vi.fn(), isLoading: false }));
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ ready: session.ready, authenticated: session.authenticated, login: session.login }),
}));
vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () =>
    session.authenticated ? { activeWallet: { address: ADDRESS }, walletAddress: ADDRESS.toLowerCase() } : { activeWallet: undefined, walletAddress: undefined },
}));
vi.mock('@/hooks/useMyProfile', () => ({
  useMyProfile: () => ({ profile: null, isLoading: session.isLoading, updateProfile: vi.fn(), isSaving: false }),
}));
vi.mock('@/hooks/useReputation', () => ({
  useReputation: () => ({ ...getReputationSummaryFromStats(0, 0), isLoading: false, isError: false }),
}));
vi.mock('@/hooks/usePlayerTotals', () => ({
  usePlayerTotals: () => ({ totals: { wins: 0, losses: 0, stakedRaw: 0n, takenRaw: 0n }, isLoading: false, isError: false, retry: vi.fn() }),
}));
vi.mock('@/hooks/useSocialLinks', () => ({
  useSocialLinks: () => ({
    startSteam: { isPending: false, mutateAsync: vi.fn() },
    startTelegram: { isPending: false, mutateAsync: vi.fn() },
    setInstagram: { isPending: false, mutateAsync: vi.fn() },
    unlink: { isPending: false, mutateAsync: vi.fn() },
  }),
}));
vi.mock('@/components/profile/OAuthCallbackHandler', () => ({ OAuthCallbackHandler: () => null }));

const { MyProfile } = await import('@/components/profile/MyProfile');

const en = translations.en;

beforeEach(() => {
  Object.assign(session, { ready: true, authenticated: false, isLoading: false });
  session.login.mockClear();
});

afterEach(cleanup);

describe('MyProfile', () => {
  it('asks a signed-out reader to sign in, and signs them in on request', () => {
    render(<MyProfile />);

    fireEvent.click(screen.getByRole('button', { name: en['nav.connectWallet'] }));

    expect(screen.getByRole('heading', { level: 1, name: en['profile.signedOutTitle'] })).toBeTruthy();
    expect(session.login).toHaveBeenCalledOnce();
  });

  it('shows the profile’s shape while the sign-in is still settling', () => {
    session.ready = false;
    render(<MyProfile />);

    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('lets the owner edit their profile and link accounts', () => {
    session.authenticated = true;
    render(<MyProfile />);

    expect(screen.getByRole('heading', { name: en['profile.yourProfile'] })).toBeTruthy();
    expect(screen.getByRole('heading', { name: en['profile.socialLinks.title'] })).toBeTruthy();
  });

  it('leads the owner to their profile as everyone else sees it', () => {
    session.authenticated = true;
    render(<MyProfile />);

    expect(screen.getByRole('link', { name: en['profile.publicLink'] }).getAttribute('href')).toBe(`/profile/${ADDRESS.toLowerCase()}`);
  });
});
