// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SigningModel } from '@/components/sign/signingModel';
import { joinModel } from '@/components/sign/__tests__/helpers/signingModels';
import type { WalletKind } from '@/lib/analytics';
import { DEFAULT_CHAIN } from '@/lib/constants';

const sent = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock('@/lib/analytics', () => sent);

const { useSigningAnalytics } = await import('@/hooks/useSigningAnalytics');

function windowOf(model: SigningModel, walletKind: WalletKind | undefined) {
  return renderHook(({ shown }) => useSigningAnalytics(shown, walletKind), { initialProps: { shown: model } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('useSigningAnalytics', () => {
  it('reports the window opening with its action, duel, contract, stake and wallet', () => {
    windowOf(joinModel(), 'embedded');

    expect(sent.trackEvent).toHaveBeenCalledWith('signing_opened', {
      action: 'joinDuelWithPermit',
      chain_id: DEFAULT_CHAIN.id,
      contract: DEFAULT_CHAIN.duelMe.toLowerCase(),
      route: 'relay',
      duel_id: 3,
      duels: undefined,
      stake: '5',
      wallet_kind: 'embedded',
    });
  });

  it('reports each change once, however often the window renders', () => {
    const { rerender } = windowOf(joinModel(), 'embedded');
    const failed = joinModel({ place: 'write', error: { kind: 'rejected', detail: null, canRetry: true } });

    rerender({ shown: failed });
    rerender({ shown: failed });
    rerender({ shown: joinModel({ place: 'success' }) });
    rerender({ shown: joinModel({ place: 'success', open: false }) });

    expect(sent.trackEvent.mock.calls.map(([name]) => name)).toEqual(['signing_opened', 'signing_failed', 'signing_done']);
  });

  it('reports a window taken off the page while open: abandoned, or left while confirming', () => {
    windowOf(joinModel({ place: 'write' }), 'embedded').unmount();
    windowOf(joinModel({ place: 'write', actionState: 'confirming' }), 'embedded').unmount();
    windowOf(joinModel({ place: 'success', open: false }), 'embedded').unmount();

    expect(sent.trackEvent.mock.calls.map(([name, props]) => [name, props.place])).toEqual([
      ['signing_opened', undefined],
      ['signing_abandoned', 'write'],
      ['signing_opened', undefined],
      ['signing_left', 'write'],
    ]);
  });

  it('names the wallet as the window gives it, and none while signed out', () => {
    windowOf(joinModel(), 'external');
    windowOf(joinModel(), undefined);

    expect(sent.trackEvent.mock.calls.map(([, props]) => props.wallet_kind)).toEqual(['external', undefined]);
  });
});
