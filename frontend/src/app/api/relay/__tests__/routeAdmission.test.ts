import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_QUEUE_DEPTH, withRelayerLock } from '@/lib/relayerQueue';
import { RELAY_POSTS_PER_MINUTE } from '@/lib/relayerRateLimit';
import {
  TX_HASH,
  deferred,
  forwardRequest,
  post,
  postRequest,
  publicClient,
  resetRelayRoute,
  setDailyBudgetWei,
  walletClient,
} from './routeFixture';

vi.mock('@/lib/relayerConfig', () => ({ getRelayerConfig: vi.fn() }));

beforeEach(() => {
  resetRelayRoute();
});

function holdTheQueue() {
  const gate = deferred();
  const held = Array.from({ length: MAX_QUEUE_DEPTH }, () => withRelayerLock(() => gate.promise));
  return async () => {
    gate.resolve();
    await Promise.all(held);
  };
}

describe('POST /api/relay — admission', () => {
  it('relays a request that verifies and simulates', async () => {
    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ hash: TX_HASH });
    expect(walletClient.writeContract).toHaveBeenCalledWith(expect.objectContaining({ nonce: 7 }));
  });

  it('turns away a request that would revert without queueing, even when the queue is full', async () => {
    publicClient.estimateContractGas.mockRejectedValue(new Error('execution reverted'));
    publicClient.call.mockRejectedValue(new Error('Nothing to claim'));
    const release = holdTheQueue();

    const junk = await postRequest(forwardRequest(1n));

    expect(junk.status).toBe(400);
    await expect(junk.json()).resolves.toMatchObject({ code: 'EXECUTION_REVERTED' });
    await release();
  });

  it('still sheds a request that passed admission when the queue is full', async () => {
    const release = holdTheQueue();

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(503);
    expect(walletClient.writeContract).not.toHaveBeenCalled();
    await release();
  });

  it('does not simulate a request the forwarder rejects', async () => {
    publicClient.readContract.mockResolvedValue(false);

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_SIGNATURE' });
    expect(publicClient.estimateContractGas).not.toHaveBeenCalled();
  });

  it('says it could not price the request when only the outer estimate fails', async () => {
    publicClient.estimateContractGas.mockRejectedValue(new Error('rpc hiccup'));

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: 'RELAYER_UNAVAILABLE' });
  });

  it('refuses without sending when the signer nonce moved while the request waited for the lock', async () => {
    publicClient.readContract.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_SIGNATURE' });
    expect(publicClient.readContract).toHaveBeenCalledTimes(2);
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it('refuses without sending an action that stopped executing while it waited for the lock', async () => {
    publicClient.estimateContractGas.mockResolvedValueOnce(200_000n).mockRejectedValueOnce(new Error('reverted'));
    publicClient.call.mockRejectedValue(new Error('Duel already joined'));

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'EXECUTION_REVERTED' });
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it('refuses without sending once the daily allowance cannot cover the worst case', async () => {
    setDailyBudgetWei(1n);

    const response = await postRequest(forwardRequest(1n));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ code: 'BUDGET_EXCEEDED' });
    expect(walletClient.writeContract).not.toHaveBeenCalled();
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
