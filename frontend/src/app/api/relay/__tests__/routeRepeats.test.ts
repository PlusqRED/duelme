import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRecord } from '@/lib/parsing';
import {
  minedReceipt,
  TX_HASH,
  deferred,
  forwardRequest,
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

/** Holds the next receipt back until the returned function is called. */
function delayReceipt() {
  const gate = deferred();
  publicClient.waitForTransactionReceipt.mockImplementationOnce(async () => {
    await gate.promise;
    return minedReceipt;
  });
  return gate.resolve;
}

/** Lets fire-and-forget receipt waits settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Relays one request to read the worst case the route reserves for it, then starts over. */
async function worstCaseOfOneRelay(): Promise<bigint> {
  await postRequest(forwardRequest(1n));
  const sent: unknown = walletClient.writeContract.mock.lastCall?.[0];
  resetRelayRoute();

  if (!isRecord(sent) || typeof sent.gas !== 'bigint' || typeof sent.maxFeePerGas !== 'bigint') {
    throw new Error('The dry run sent no transaction.');
  }
  return sent.gas * sent.maxFeePerGas;
}

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
        return minedReceipt;
      });

    const first = await postRequest(forwardRequest(1n));
    expect(first.status).toBe(200);

    expect((await postRequest(forwardRequest(2n))).status).toBe(409);

    mine.resolve();
    await settle();
    expect((await postRequest(forwardRequest(2n))).status).toBe(200);
  });

  it('books the real cost once a receipt that outlived the wait does land', async () => {
    const worstCaseWei = await worstCaseOfOneRelay();
    // Room for one worst case plus the real cost of another, never for two worst cases.
    setDailyBudgetWei(worstCaseWei + worstCaseWei / 2n);
    const mine = deferred();
    publicClient.waitForTransactionReceipt
      .mockRejectedValueOnce(new Error('timed out'))
      .mockImplementationOnce(async () => {
        await mine.promise;
        return minedReceipt;
      });

    expect((await postRequest(forwardRequest(1n))).status).toBe(200);
    mine.resolve();
    await settle();

    expect((await postRequest(forwardRequest(2n))).status).toBe(200);
  });

  it('holds nobody and hands the reservation back when the broadcast fails', async () => {
    setDailyBudgetWei(await worstCaseOfOneRelay());
    walletClient.writeContract.mockRejectedValueOnce(new Error('rpc down'));

    const failed = await postRequest(forwardRequest(1n));

    expect(failed.status).toBe(502);
    // The node may have taken it all the same, so the answer never says it was not sent.
    await expect(failed.json()).resolves.toMatchObject({ code: 'BROADCAST_UNCERTAIN' });

    expect((await postRequest(forwardRequest(2n))).status).toBe(200);
  });

  it('forgets a request that reverted on-chain, so a repeat is checked again', async () => {
    publicClient.waitForTransactionReceipt.mockResolvedValueOnce({ ...minedReceipt, status: 'reverted' });
    const request = forwardRequest(1n);

    const reverted = await postRequest(request);

    expect(reverted.status).toBe(409);
    await expect(reverted.json()).resolves.toMatchObject({ code: 'EXECUTION_REVERTED' });

    expect((await postRequest(request)).status).toBe(200);
    expect(walletClient.writeContract).toHaveBeenCalledTimes(2);
  });
});
