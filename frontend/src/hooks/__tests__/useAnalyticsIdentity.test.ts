// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentState } from '@/lib/analyticsConsent';

interface LoginDone {
  isNewUser: boolean;
  wasAlreadyAuthenticated: boolean;
  loginMethod: string | null;
}

const privy = vi.hoisted(() => ({
  ready: true,
  authenticated: false,
  user: null as { id: string } | null,
  wallet: null as { walletClientType: string } | null,
  address: undefined as string | undefined,
  onLogin: null as ((done: LoginDone) => void) | null,
  onLogout: null as (() => void) | null,
}));
const analytics = vi.hoisted(() => ({ identifyPlayer: vi.fn(), forgetPlayer: vi.fn(), trackEvent: vi.fn() }));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ ready: privy.ready, authenticated: privy.authenticated, user: privy.user }),
  useLogin: (callbacks: { onComplete: (done: LoginDone) => void }) => {
    privy.onLogin = callbacks.onComplete;
    return { login: vi.fn() };
  },
  useLogout: (callbacks: { onSuccess: () => void }) => {
    privy.onLogout = callbacks.onSuccess;
    return { logout: vi.fn() };
  },
}));
vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: privy.wallet, walletAddress: privy.address }),
}));
vi.mock('@/lib/analytics', () => analytics);

const { useAnalyticsIdentity } = await import('@/hooks/useAnalyticsIdentity');

function signIn() {
  privy.authenticated = true;
  privy.user = { id: 'did:privy:abc' };
  privy.wallet = { walletClientType: 'privy' };
  privy.address = '0xabc';
}

function identity(consent: ConsentState) {
  return renderHook(({ answer }) => useAnalyticsIdentity(answer), { initialProps: { answer: consent } });
}

beforeEach(() => {
  privy.ready = true;
  privy.authenticated = false;
  privy.user = null;
  privy.wallet = null;
  privy.address = undefined;
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('useAnalyticsIdentity', () => {
  it('names a signed-in player who agreed, by their Privy id with the wallet as a trait', () => {
    signIn();

    identity('granted');

    expect(analytics.identifyPlayer).toHaveBeenCalledWith('did:privy:abc', { wallet: '0xabc', wallet_kind: 'embedded' });
    expect(analytics.forgetPlayer).not.toHaveBeenCalled();
  });

  it('says when the wallet is the player’s own', () => {
    signIn();
    privy.wallet = { walletClientType: 'metamask' };

    identity('granted');

    expect(analytics.identifyPlayer).toHaveBeenCalledWith('did:privy:abc', { wallet: '0xabc', wallet_kind: 'external' });
  });

  it('never names a player without their yes', () => {
    signIn();

    for (const answer of ['unset', 'denied'] as const) {
      identity(answer);
    }

    expect(analytics.identifyPlayer).not.toHaveBeenCalled();
    expect(analytics.forgetPlayer).toHaveBeenCalledTimes(2);
  });

  it('forgets the player once the yes is taken back', () => {
    signIn();
    const { rerender } = identity('granted');

    rerender({ answer: 'denied' });

    expect(analytics.forgetPlayer).toHaveBeenCalledTimes(1);
  });

  it('waits for the answer and for Privy before doing either', () => {
    signIn();
    identity('unknown');
    privy.ready = false;
    identity('granted');

    expect(analytics.identifyPlayer).not.toHaveBeenCalled();
    expect(analytics.forgetPlayer).not.toHaveBeenCalled();
  });

  it('counts a sign-in with its method and whether the player is new, for everyone', () => {
    identity('unset');

    privy.onLogin?.({ isNewUser: true, wasAlreadyAuthenticated: false, loginMethod: 'google' });
    privy.onLogin?.({ isNewUser: false, wasAlreadyAuthenticated: false, loginMethod: null });

    expect(analytics.trackEvent.mock.calls).toEqual([
      ['signed_in', { method: 'google', new_user: 1 }],
      ['signed_in', { method: 'unknown', new_user: 0 }],
    ]);
  });

  it('does not count a player who came back already signed in', () => {
    identity('unset');

    privy.onLogin?.({ isNewUser: false, wasAlreadyAuthenticated: true, loginMethod: 'email' });

    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });

  it('counts a sign-out', () => {
    identity('granted');

    privy.onLogout?.();

    expect(analytics.trackEvent).toHaveBeenCalledWith('signed_out', {});
  });
});
