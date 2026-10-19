// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlowFunding, FlowReviewGate } from '@/hooks/useFlowFunding';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const CHAIN = SUPPORTED_CHAINS.arbitrumSepolia;

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { address: ADDRESS }, walletAddress: ADDRESS.toLowerCase() }),
}));
vi.mock('@/components/topup/TopUpWindow', () => ({
  TopUpWindow: ({ chainId, neededRaw, onClose }: { chainId: number | null; neededRaw: bigint; onClose: () => void }) =>
    chainId === null ? null : (
      <button type="button" onClick={onClose}>
        Top-up window on {chainId} for {String(neededRaw)}
      </button>
    ),
}));

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
      view: 'review',
      retry: vi.fn(),
      showDeposit: vi.fn(),
      showReview: vi.fn(),
      ...funding,
    },
    canContinue: false,
    blockedReason,
  };
}

function renderCheck(review: FlowReviewGate) {
  return render(<FlowFundingCheck review={review} chainId={CHAIN.id} chainName={CHAIN.name} neededRaw={50_000_000n} isJoining={false} />);
}

describe('FlowFundingCheck', () => {
  it('shows the balance on the duel\'s network and how much is missing', () => {
    renderCheck(gate({}));

    expect(screen.getByText('Your balance on Arbitrum Sepolia')).toBeTruthy();
    expect(screen.getByText('46.7 USDT')).toBeTruthy();
    expect(screen.getByText('3.3 USDT short')).toBeTruthy();
  });

  it('opens the top-up window from Top up', () => {
    const review = gate({});
    renderCheck(review);

    fireEvent.click(screen.getByRole('button', { name: 'Top up' }));

    expect(review.funding.showDeposit).toHaveBeenCalledOnce();
  });

  it('shows the top-up window for the duel while the player tops up, and comes back from it', () => {
    const review = gate({ view: 'deposit' });
    renderCheck(review);

    fireEvent.click(screen.getByRole('button', { name: `Top-up window on ${CHAIN.id} for 50000000` }));

    expect(review.funding.showReview).toHaveBeenCalledOnce();
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
