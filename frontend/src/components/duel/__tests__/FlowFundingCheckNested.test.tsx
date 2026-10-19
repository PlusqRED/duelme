// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
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

describe('FlowFundingCheck inside the flow\'s window', () => {
  it('opens the top-up window over the flow, and Esc closes only the top-up window', async () => {
    const review: FlowReviewGate = {
      funding: {
        balance: { kind: 'ready', raw: 46_700_000n },
        status: { kind: 'short', shortfallRaw: 3_300_000n },
        view: 'deposit',
        retry: vi.fn(),
        showDeposit: vi.fn(),
        showReview: vi.fn(),
      },
      canContinue: false,
      blockedReason: null,
    };
    const onFlowOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onFlowOpenChange}>
        <DialogContent>
          <DialogTitle>Create a duel</DialogTitle>
          <FlowFundingCheck review={review} chainId={CHAIN.id} chainName={CHAIN.name} neededRaw={50_000_000n} isJoining={false} />
        </DialogContent>
      </Dialog>
    );

    const topUp = await screen.findByRole('dialog', { name: 'Top up' });
    fireEvent.keyDown(topUp, { key: 'Escape' });

    expect(review.funding.showReview).toHaveBeenCalledOnce();
    expect(onFlowOpenChange).not.toHaveBeenCalled();
  });
});
