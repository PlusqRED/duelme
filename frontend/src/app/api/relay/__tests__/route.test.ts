import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeFunctionData, type Hex } from 'viem';
import { POST } from '@/app/api/relay/route';
import { duelMeAbi } from '@/lib/contracts';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { getRelayerConfig, type RelayerConfig } from '@/lib/relayerConfig';
import { resetDailyBudgets } from '@/lib/relayerBudget';
import { resetRelayDedup } from '@/lib/relayerDedup';
import { MAX_QUEUE_DEPTH, resetRelayerQueue, withRelayerLock } from '@/lib/relayerQueue';
import { RELAY_POSTS_PER_MINUTE, resetRelayRateLimit } from '@/lib/relayerRateLimit';
import type { RelayForwardRequest } from '@/lib/relayRequest';

vi.mock('@/lib/relayerConfig', () => ({ getRelayerConfig: vi.fn() }));

const RELAYER = '0x00000000000000000000000000000000000000aa';
const FORWARDER = '0x00000000000000000000000000000000000000fa';
const TX_HASH: Hex = `0x${'cd'.repeat(32)}`;

function forwardRequest(duelId: bigint): RelayForwardRequest {
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

function post(body: unknown, client = '203.0.113.7') {
  return POST(
    new Request('http://127.0.0.1/api/relay', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': client },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

function postRequest(request: RelayForwardRequest, client?: string) {
  return post({ chainId: DEFAULT_CHAIN_ID, request }, client);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const publicClient = {
  readContract: vi.fn(),
  estimateContractGas: vi.fn(),
  call: vi.fn(),
  estimateFeesPerGas: vi.fn(),
  getBlock: vi.fn(),
  getTransactionCount: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
};
const walletClient = { writeContract: vi.fn() };

const config = {
  chainId: DEFAULT_CHAIN_ID,
  duelMeAddress: DUELME_ADDRESSES[DEFAULT_CHAIN_ID],
  forwarderAddress: FORWARDER,
  dailyBudgetWei: 10n ** 18n,
  globalDailyBudgetWei: 10n ** 18n,
  publicClient,
  walletClient,
  account: { address: RELAYER },
  relayerAddress: RELAYER,
} as unknown as RelayerConfig;

beforeEach(() => {
  resetRelayerQueue();
  resetRelayDedup();
  resetRelayRateLimit();
  resetDailyBudgets();
  vi.mocked(getRelayerConfig).mockReturnValue({ ok: true, config });

  publicClient.readContract.mockResolvedValue(true);
  publicClient.estimateContractGas.mockResolvedValue(200_000n);
  publicClient.call.mockResolvedValue({ data: '0x' });
  publicClient.estimateFeesPerGas.mockResolvedValue({ maxFeePerGas: 20_000_000n, maxPriorityFeePerGas: 0n });
  publicClient.getBlock.mockResolvedValue({ baseFeePerGas: 10_000_000n });
  publicClient.getTransactionCount.mockResolvedValue(7);
  publicClient.waitForTransactionReceipt.mockResolvedValue({
    status: 'success',
    gasUsed: 150_000n,
    effectiveGasPrice: 10_000_000n,
  });
  walletClient.writeContract.mockResolvedValue(TX_HASH);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/relay', () => {
  it('relays a request that verifies and simulates', async () => {
    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ hash: TX_HASH });
    expect(walletClient.writeContract).toHaveBeenCalledWith(expect.objectContaining({ nonce: 7 }));
  });

  it('turns away a request that would revert without queueing, even when the queue is full', async () => {
    publicClient.estimateContractGas.mockRejectedValue(new Error('execution reverted'));
    publicClient.call.mockRejectedValue(new Error('Nothing to claim'));
    const gate = deferred();
    const held = Array.from({ length: MAX_QUEUE_DEPTH }, () => withRelayerLock(() => gate.promise));

    const junk = await postRequest(forwardRequest(1n));

    expect(junk.status).toBe(400);
    await expect(junk.json()).resolves.toMatchObject({ code: 'EXECUTION_REVERTED' });

    gate.resolve();
    await Promise.all(held);
  });

  it('still sheds a request that passed admission when the queue is full', async () => {
    const gate = deferred();
    const held = Array.from({ length: MAX_QUEUE_DEPTH }, () => withRelayerLock(() => gate.promise));

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(503);
    expect(walletClient.writeContract).not.toHaveBeenCalled();

    gate.resolve();
    await Promise.all(held);
  });

  it('does not simulate a request the forwarder rejects', async () => {
    publicClient.readContract.mockResolvedValue(false);

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_SIGNATURE' });
    expect(publicClient.estimateContractGas).not.toHaveBeenCalled();
  });

  it('refuses without sending when the signer nonce moved while the request waited for the lock', async () => {
    publicClient.readContract.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_SIGNATURE' });
    expect(publicClient.readContract).toHaveBeenCalledTimes(2);
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it('answers a repeated request with the first transaction instead of sending a second', async () => {
    const request = forwardRequest(1n);

    const [first, concurrent] = await Promise.all([postRequest(request), postRequest(request)]);
    const later = await postRequest(request);

    for (const response of [first, concurrent, later]) {
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ hash: TX_HASH });
    }
    expect(walletClient.writeContract).toHaveBeenCalledTimes(1);
  });

  it('refuses a different request from a signer whose last transaction has no receipt yet', async () => {
    const gate = deferred();
    publicClient.waitForTransactionReceipt.mockImplementationOnce(async () => {
      await gate.promise;
      return { status: 'success', gasUsed: 150_000n, effectiveGasPrice: 10_000_000n };
    });

    const first = postRequest(forwardRequest(1n));
    await vi.waitFor(() => expect(walletClient.writeContract).toHaveBeenCalledTimes(1));
    const resigned = await postRequest(forwardRequest(2n));

    expect(resigned.status).toBe(409);
    await expect(resigned.json()).resolves.toMatchObject({ code: 'RELAY_PENDING' });
    expect(publicClient.estimateContractGas).toHaveBeenCalledTimes(1);

    gate.resolve();
    expect((await first).status).toBe(200);
    expect((await postRequest(forwardRequest(2n))).status).toBe(200);
    expect(walletClient.writeContract).toHaveBeenCalledTimes(2);
  });

  it('refuses under the lock a request whose signer had another one sent while it was admitted', async () => {
    const gate = deferred();
    publicClient.waitForTransactionReceipt.mockImplementationOnce(async () => {
      await gate.promise;
      return { status: 'success', gasUsed: 150_000n, effectiveGasPrice: 10_000_000n };
    });

    const first = postRequest(forwardRequest(1n));
    const second = await postRequest(forwardRequest(2n));

    expect(second.status).toBe(409);
    // Both were admitted, so it was the check under the lock that stopped the second.
    expect(publicClient.estimateContractGas).toHaveBeenCalledTimes(2);
    expect(walletClient.writeContract).toHaveBeenCalledTimes(1);

    gate.resolve();
    expect((await first).status).toBe(200);
  });

  it('relays two different requests separately', async () => {
    await postRequest(forwardRequest(1n));
    await postRequest(forwardRequest(2n));

    expect(walletClient.writeContract).toHaveBeenCalledTimes(2);
  });

  it('refuses the 31st post in a minute from one client, before reading the body', async () => {
    for (let i = 0; i < RELAY_POSTS_PER_MINUTE; i += 1) {
      expect((await post('not json')).status).toBe(400);
    }

    const limited = await post('not json');

    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toMatch(/^\d+$/);
    await expect(limited.json()).resolves.toMatchObject({ code: 'RATE_LIMITED' });
    expect((await post('not json', '198.51.100.1')).status).toBe(400);
  });
});
