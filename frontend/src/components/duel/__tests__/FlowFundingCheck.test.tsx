// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { FlowFunding, FlowReviewGate } from '@/hooks/useFlowFunding';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const CHAIN = SUPPORTED_CHAINS.arbitrumSepolia;

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { address: ADDRESS }, walletAddress: ADDRESS.toLowerCase() }),
}));
vi.mock('@/hooks/useUsdtBalance', () => ({ useUsdtBalance: () => ({ read: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: true }) }));
vi.mock('@/hooks/useFaucetClaim', () => ({ useFaucetClaim: () => ({ offer: { kind: 'none' }, isClaiming: false, claim: vi.fn() }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { FlowFundingCheck } = await import('@/components/duel/FlowFundingCheck');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function gate(funding: Partial<FlowFunding>, blockedReason: FlowReviewGate['blockedReason'] = null): FlowReviewGate {
  return {
    funding: {
      balance: { kind: 'ready', raw: 46_700_000n },
      status: { kind: 'short', shortfallRaw: 3_300_000n },
      isTopUpOpen: false,
      retry: vi.fn(),
      openTopUp: vi.fn(),
      closeTopUp: vi.fn(),
      ...funding,
    },
    canContinue: false,
    blockedReason,
  };
}

function renderCheck(review: FlowReviewGate, { isJoining = false } = {}) {
  return render(<FlowFundingCheck review={review} chainId={CHAIN.id} chainName={CHAIN.name} neededRaw={50_000_000n} isJoining={isJoining} />);
}

describe('FlowFundingCheck', () => {
  it('shows the balance on the duel\'s network and how much is missing', () => {
    renderCheck(gate({}));

    expect(screen.getByText('Your balance on Arbitrum Sepolia')).toBeTruthy();
    expect(screen.getByText('46.7 USDT')).toBeTruthy();
    expect(screen.getByText('3.3 USDT short')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the top-up window from Top up', () => {
    const review = gate({});
    renderCheck(review);

    fireEvent.click(screen.getByRole('button', { name: 'Top up' }));

    expect(review.funding.openTopUp).toHaveBeenCalledOnce();
  });

  it('shows the top-up window for the duel, with the flow\'s balance, and comes back from it', async () => {
    const review = gate({ isTopUpOpen: true });
    renderCheck(review, { isJoining: true });

    await screen.findByRole('dialog', { name: 'Top up' });
    expect(screen.getByText('Needed for this duel: 50 USDT')).toBeTruthy();
    expect(screen.getByText('Topping up doesn’t hold your place: someone else can still join first.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the duel' }));

    expect(review.funding.closeTopUp).toHaveBeenCalledOnce();
  });

  it('opens the top-up window over the flow\'s window, and Esc closes only the top-up window', async () => {
    const review = gate({ isTopUpOpen: true });
    const onFlowOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onFlowOpenChange}>
        <DialogContent>
          <DialogTitle>Create a duel</DialogTitle>
          <FlowFundingCheck review={review} chainId={CHAIN.id} chainName={CHAIN.name} neededRaw={50_000_000n} isJoining={false} />
        </DialogContent>
      </Dialog>
    );

    fireEvent.keyDown(await screen.findByRole('dialog', { name: 'Top up' }), { key: 'Escape' });

    expect(review.funding.closeTopUp).toHaveBeenCalledOnce();
    expect(onFlowOpenChange).not.toHaveBeenCalled();
  });

  it('opens no top-up window before there is a wallet to read', () => {
    renderCheck(gate({ balance: { kind: 'no-wallet' }, status: { kind: 'unknown' }, isTopUpOpen: true }));

    expect(screen.getByText('Wallet not ready. Please try again.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers no top-up for a duel that can no longer be joined, and says why', () => {
    renderCheck(gate({}, 'join.flow.unavailable'));

    expect(screen.queryByRole('button', { name: 'Top up' })).toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('This duel can’t be joined anymore');
  });

  it('says a balance it failed to read failed, and reads it again', () => {
    const review = gate({ balance: { kind: 'error' }, status: { kind: 'unknown' } });
    renderCheck(review);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(review.funding.retry).toHaveBeenCalledOnce();
  });
});
