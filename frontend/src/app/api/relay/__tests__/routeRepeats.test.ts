import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MINED,
  TX_HASH,
  deferred,
  forwardRequest,
  postRequest,
  publicClient,
  resetRelayRoute,
  walletClient,
} from './routeFixture';

vi.mock('@/lib/relayerConfig', () => ({ getRelayerConfig: vi.fn() }));

beforeEach(() => {
  resetRelayRoute();
});

/** Holds the next receipt back until the returned function is called. */
function delayReceipt() {
  const gate = deferred();
  publicClient.waitForTransactionReceipt.mockImplementationOnce(async () => {
    await gate.promise;
    return MINED;
  });
  return gate.resolve;
}

/** Lets fire-and-forget receipt waits settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('POST /api/relay — repeats and the signer hold', () => {
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

  it('relays two different requests separately', async () => {
    await postRequest(forwardRequest(1n));
    await postRequest(forwardRequest(2n));

    expect(walletClient.writeContract).toHaveBeenCalledTimes(2);
  });

  it('refuses a different request from a signer whose last transaction has no receipt yet', async () => {
    const mine = delayReceipt();

    const first = postRequest(forwardRequest(1n));
    await vi.waitFor(() => expect(walletClient.writeContract).toHaveBeenCalledTimes(1));
    const resigned = await postRequest(forwardRequest(2n));

    expect(resigned.status).toBe(409);
    await expect(resigned.json()).resolves.toMatchObject({ code: 'RELAY_PENDING' });
    // Admission and the lock each simulated the first request; the second was never simulated.
    expect(publicClient.estimateContractGas).toHaveBeenCalledTimes(2);

    mine();
    expect((await first).status).toBe(200);
    expect((await postRequest(forwardRequest(2n))).status).toBe(200);
    expect(walletClient.writeContract).toHaveBeenCalledTimes(2);
  });

  it('refuses under the lock a request whose signer had another one sent while it was admitted', async () => {
    const mine = delayReceipt();

    const first = postRequest(forwardRequest(1n));
    const second = await postRequest(forwardRequest(2n));

    expect(second.status).toBe(409);
    // Admitted (one simulation each), so it was the check under the lock that stopped it.
    expect(publicClient.estimateContractGas).toHaveBeenCalledTimes(3);
    expect(walletClient.writeContract).toHaveBeenCalledTimes(1);

    mine();
    expect((await first).status).toBe(200);
  });

  it('keeps the signer held past a receipt timeout until the transaction does land', async () => {
    const mine = deferred();
    publicClient.waitForTransactionReceipt
      .mockRejectedValueOnce(new Error('timed out'))
      .mockImplementationOnce(async () => {
        await mine.promise;
        return MINED;
      });

    const first = await postRequest(forwardRequest(1n));
    expect(first.status).toBe(200);

    expect((await postRequest(forwardRequest(2n))).status).toBe(409);

    mine.resolve();
    await settle();
    expect((await postRequest(forwardRequest(2n))).status).toBe(200);
  });

  it('forgets a request that reverted on-chain, so a repeat is checked again', async () => {
    publicClient.waitForTransactionReceipt.mockResolvedValueOnce({ ...MINED, status: 'reverted' });
    const request = forwardRequest(1n);

    const reverted = await postRequest(request);

    expect(reverted.status).toBe(409);
    await expect(reverted.json()).resolves.toMatchObject({ code: 'EXECUTION_REVERTED' });

    expect((await postRequest(request)).status).toBe(200);
    expect(walletClient.writeContract).toHaveBeenCalledTimes(2);
  });
});
