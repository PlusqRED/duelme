import { vi } from 'vitest';
import { encodeFunctionData, type Hex } from 'viem';
import { POST } from '@/app/api/relay/route';
import { duelMeAbi } from '@/lib/contracts';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { getRelayerConfig, type RelayerConfig } from '@/lib/relayerConfig';
import { resetDailyBudgets } from '@/lib/relayerBudget';
import { resetRelayDedup } from '@/lib/relayerDedup';
import { resetRelayerQueue } from '@/lib/relayerQueue';
import { resetRelayRateLimit } from '@/lib/relayerRateLimit';
import { resetSignerHolds } from '@/lib/relayerSignerHold';
import type { RelayForwardRequest } from '@/lib/relayRequest';

/**
 * Shared scaffolding for the POST /api/relay suites. Each suite must call
 * `vi.mock('@/lib/relayerConfig', () => ({ getRelayerConfig: vi.fn() }))` itself — the mock
 * is hoisted per file — and `resetRelayRoute()` from its `beforeEach`.
 */

const RELAYER = '0x00000000000000000000000000000000000000aa';
const FORWARDER = '0x00000000000000000000000000000000000000fa';
export const TX_HASH: Hex = `0x${'cd'.repeat(32)}`;
export const MINED = { status: 'success', gasUsed: 150_000n, effectiveGasPrice: 10_000_000n } as const;

export function forwardRequest(duelId: bigint): RelayForwardRequest {
  return {
    from: '0x328809Bc894f92807417D2dAD6b7C998c1aFdac6',
    to: DUELME_ADDRESSES[DEFAULT_CHAIN_ID],
    value: '0',
    gas: '400000',
    deadline: 1_800_000_000,
    data: encodeFunctionData({ abi: duelMeAbi, functionName: 'claimPayout', args: [duelId] }),
    signature: `0x${'11'.repeat(65)}`,
  };
}

export function post(body: unknown, client = '203.0.113.7') {
  return POST(
    new Request('http://127.0.0.1/api/relay', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': client },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

export function postRequest(request: RelayForwardRequest, client?: string) {
  return post({ chainId: DEFAULT_CHAIN_ID, request }, client);
}

export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

export const publicClient = {
  readContract: vi.fn(),
  estimateContractGas: vi.fn(),
  call: vi.fn(),
  estimateFeesPerGas: vi.fn(),
  getBlock: vi.fn(),
  getTransactionCount: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
};
export const walletClient = { writeContract: vi.fn() };

const BUDGET_WEI = 10n ** 18n;

const configFields = {
  chainId: DEFAULT_CHAIN_ID,
  duelMeAddress: DUELME_ADDRESSES[DEFAULT_CHAIN_ID],
  forwarderAddress: FORWARDER,
  dailyBudgetWei: BUDGET_WEI,
  globalDailyBudgetWei: BUDGET_WEI,
  publicClient,
  walletClient,
  account: { address: RELAYER },
  relayerAddress: RELAYER,
};
export const config = configFields as unknown as RelayerConfig;

export function resetRelayRoute(): void {
  vi.clearAllMocks();
  resetRelayerQueue();
  resetRelayDedup();
  resetRelayRateLimit();
  resetSignerHolds();
  resetDailyBudgets();
  configFields.dailyBudgetWei = BUDGET_WEI;
  vi.mocked(getRelayerConfig).mockReturnValue({ ok: true, config });

  publicClient.readContract.mockResolvedValue(true);
  publicClient.estimateContractGas.mockResolvedValue(200_000n);
  publicClient.call.mockResolvedValue({ data: '0x' });
  publicClient.estimateFeesPerGas.mockResolvedValue({ maxFeePerGas: 20_000_000n, maxPriorityFeePerGas: 0n });
  publicClient.getBlock.mockResolvedValue({ baseFeePerGas: 10_000_000n });
  publicClient.getTransactionCount.mockResolvedValue(7);
  publicClient.waitForTransactionReceipt.mockResolvedValue(MINED);
  walletClient.writeContract.mockResolvedValue(TX_HASH);
}

export function setDailyBudgetWei(wei: bigint): void {
  configFields.dailyBudgetWei = wei;
}
