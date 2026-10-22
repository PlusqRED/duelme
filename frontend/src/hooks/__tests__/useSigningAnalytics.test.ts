// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SigningModel } from '@/components/sign/signingModel';
import { joinModel } from '@/components/sign/__tests__/helpers/signingModels';
import { DEFAULT_CHAIN } from '@/lib/constants';

const sent = vi.hoisted(() => ({ trackEvent: vi.fn() }));
const wallet = vi.hoisted(() => ({ activeWallet: { walletClientType: 'privy' } as { walletClientType: string } | null }));

vi.mock('@/lib/analytics', () => sent);
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ activeWallet: wallet.activeWallet }) }));

const { useSigningAnalytics } = await import('@/hooks/useSigningAnalytics');

function windowOf(model: SigningModel) {
  return renderHook(({ shown }) => useSigningAnalytics(shown), { initialProps: { shown: model } });
}

beforeEach(() => {
  wallet.activeWallet = { walletClientType: 'privy' };
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('useSigningAnalytics', () => {
  it('reports the window opening with its action, duel, contract, stake and wallet', () => {
    windowOf(joinModel());

    expect(sent.trackEvent).toHaveBeenCalledWith('signing_opened', {
      action: 'joinDuelWithPermit',
      chain_id: DEFAULT_CHAIN.id,
      contract: DEFAULT_CHAIN.duelMe.toLowerCase(),
      route: 'relay',
      duel_id: 3,
      duels: undefined,
      stake: '5',
      wallet: 'embedded',
    });
  });

  it('reports each change once, however often the window renders', () => {
    const { rerender } = windowOf(joinModel());
    const failed = joinModel({ place: 'write', error: { kind: 'rejected', detail: null, canRetry: true } });

    rerender({ shown: failed });
    rerender({ shown: failed });
    rerender({ shown: joinModel({ place: 'success' }) });
    rerender({ shown: joinModel({ place: 'success', open: false }) });

    expect(sent.trackEvent.mock.calls.map(([name]) => name)).toEqual(['signing_opened', 'signing_failed', 'signing_done']);
  });

  it('names an external wallet as one, and none while signed out', () => {
    wallet.activeWallet = { walletClientType: 'metamask' };
    windowOf(joinModel());
    wallet.activeWallet = null;
    windowOf(joinModel());

    expect(sent.trackEvent.mock.calls.map(([, props]) => props.wallet)).toEqual(['external', undefined]);
  });
});
