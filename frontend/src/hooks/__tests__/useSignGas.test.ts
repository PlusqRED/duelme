// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignItem } from '@/components/sign/signingModel';
import type { BalanceReading } from '@/lib/balanceStatus';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { FaucetOffer } from '@/lib/faucetApi';
import type { FlaskPhase } from '@/lib/faucetFlask';
import { ethNeeded, expectedFee, type FeeQuote } from '@/lib/gasNeeds';
import type { WriteRoute } from '@/lib/writeRoute';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const QUOTE: FeeQuote = { maxFeePerGas: 20_000_000n, gasPrice: 10_000_000n };
const GIVES_ETH: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 5_000_000_000_000_000n };

const reads = vi.hoisted(() => ({
  quote: null as FeeQuote | null,
  quoteEnabled: [] as boolean[],
  reading: { kind: 'checking' } as BalanceReading,
  offer: { kind: 'none' } as FaucetOffer,
  phase: 'hidden' as FlaskPhase,
  claim: vi.fn(async () => undefined),
  settle: vi.fn(),
  retry: vi.fn(),
}));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ walletAddress: '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23' }),
}));
vi.mock('@/hooks/useFeeQuote', () => ({
  useFeeQuote: (_chainId: number, enabled: boolean) => {
    reads.quoteEnabled.push(enabled);
    return enabled ? reads.quote : null;
  },
}));
vi.mock('@/hooks/useEthBalance', () => ({ useEthBalance: () => ({ reading: reads.reading, refetch: reads.retry }) }));
vi.mock('@/hooks/useFaucetFlask', () => ({
  useFaucetFlask: () => ({ offer: reads.offer, phase: reads.phase, claim: reads.claim, settle: reads.settle }),
}));

const { useSignGas } = await import('@/hooks/useSignGas');

const APPROVE = { kind: 'transaction', part: 'approve', gas: 'approve' } as SignItem;
const JOIN = { kind: 'transaction', part: 'move', gas: 'join' } as SignItem;

beforeEach(() => {
  reads.quote = QUOTE;
  reads.quoteEnabled = [];
  reads.reading = { kind: 'ready', raw: 10n ** 18n };
  reads.offer = { kind: 'none' };
  reads.phase = 'hidden';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderGas({ route = 'self' as WriteRoute, unpaid = [APPROVE, JOIN], open = true } = {}) {
  return renderHook(() => useSignGas({ open, chainId: SEPOLIA, route, unpaid }));
}

describe('useSignGas', () => {
  it('testUseSignGasReadsNothingOnTheRelayedPath', () => {
    const { result } = renderGas({ route: 'relay' });

    expect(result.current.eth).toBeUndefined();
    expect(result.current.fix).toBeNull();
    expect(reads.quoteEnabled.every((enabled) => !enabled)).toBe(true);
  });

  it('testUseSignGasNeedsTheEthForEveryUnsentTransaction', () => {
    const { result } = renderGas();

    expect(result.current.eth?.needWei).toBe(ethNeeded(['approve', 'join'], SEPOLIA, QUOTE));
  });

  it('testUseSignGasNeedsTheEthOfEveryDuelABatchMoveTakes', () => {
    const take = { kind: 'transaction', part: 'move', gas: 'move', gasTimes: 3 } as SignItem;

    const { result } = renderGas({ unpaid: [take] });

    expect(result.current.eth?.needWei).toBe(ethNeeded(['move', 'move', 'move'], SEPOLIA, QUOTE));
  });

  it('testUseSignGasNeedsNoEthOnceEverythingIsSent', () => {
    const { result } = renderGas({ unpaid: [] });

    expect(result.current.eth).toBeUndefined();
  });

  it('testUseSignGasOffersNoFixForAWalletWithEnough', () => {
    const { result } = renderGas();

    expect(result.current.fix).toBeNull();
  });

  it('testUseSignGasOffersTheFaucetForAShortWalletOnTheTestNetwork', () => {
    reads.reading = { kind: 'ready', raw: 0n };
    reads.offer = GIVES_ETH;
    reads.phase = 'ready';

    const { result } = renderGas();

    expect(result.current.fix).toBe('faucet');
  });

  it('testUseSignGasOffersATopUpOnceTheFaucetHasGiven', () => {
    reads.reading = { kind: 'ready', raw: 0n };
    reads.offer = { ...GIVES_ETH, kind: 'claimed' };
    reads.phase = 'claimed';

    const { result } = renderGas();

    expect(result.current.fix).toBe('topUpEth');
  });

  it('testUseSignGasOffersATopUpWhenTheFaucetGivesNoEth', () => {
    reads.reading = { kind: 'ready', raw: 0n };
    reads.offer = { ...GIVES_ETH, ethAmountWei: 0n };
    reads.phase = 'ready';

    const { result } = renderGas();

    expect(result.current.fix).toBe('topUpEth');
  });

  it('testUseSignGasShowsTheFlaskFillingWhileTheFaucetIsAsked', () => {
    reads.reading = { kind: 'ready', raw: 0n };
    reads.offer = GIVES_ETH;
    reads.phase = 'asking';

    const { result } = renderGas();

    expect(result.current.isFaucetBusy).toBe(true);
    expect(result.current.eth?.faucet?.level).toBe('filling');
    expect(result.current.eth?.faucet?.note).toBe('Asking the faucet…');
  });

  it('testUseSignGasPricesEachKindAtTheNetworksPrice', () => {
    const { result } = renderGas();

    expect(result.current.feeOf('join')).toBe(expectedFee('join', QUOTE));
  });

  it('testUseSignGasPricesNothingBeforeTheNetworkAnswers', () => {
    reads.quote = null;

    const { result } = renderGas();

    expect(result.current.feeOf('join')).toBeNull();
    expect(result.current.eth).toBeUndefined();
  });

  it('testUseSignGasOpensTheTopUpWindow', () => {
    const { result } = renderGas();

    act(() => result.current.openTopUp());

    expect(result.current.isTopUpOpen).toBe(true);
  });
});
