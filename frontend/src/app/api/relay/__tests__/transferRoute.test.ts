import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { POST } from '@/app/api/relay/transfer/route';
import { DEFAULT_CHAIN_ID, USDT_ADDRESSES } from '@/lib/constants';
import { getRelayerConfig } from '@/lib/relayerConfig';
import {
  relayedTransferDay,
  relayedTransferNonce,
  TRANSFER_AUTHORIZATION_TYPES,
  transferAuthorization,
  type RelayTransfer,
} from '@/lib/relayedTransfer';
import { TX_HASH, deferred, minedReceipt, publicClient, resetRelayRoute, setDailyBudgetWei, walletClient } from './routeFixture';

vi.mock('@/lib/relayerConfig', () => ({ getRelayerConfig: vi.fn() }));

const NOW = Date.UTC(2026, 9, 26, 12);
const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);
const TO = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';
const BALANCE = 50_000_000n;

interface TokenState {
  used: boolean | boolean[];
  balance: bigint;
}

let token: TokenState;

/** The token's two reads, by name; `used` as a list answers each read in turn. */
function answerTokenReads() {
  publicClient.readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
    if (functionName === 'balanceOf') return token.balance;
    if (functionName === 'authorizationState') return Array.isArray(token.used) ? (token.used.shift() ?? false) : token.used;
    throw new Error(`unexpected read ${functionName}`);
  });
}

async function signedTransfer(value = 5_000_000n, nowMs = NOW): Promise<RelayTransfer> {
  const message = transferAuthorization(account.address, TO, value, nowMs);
  const signature = await account.signTypedData({
    domain: { name: 'USD₮0', version: '1', chainId: BigInt(DEFAULT_CHAIN_ID), verifyingContract: USDT_ADDRESSES[DEFAULT_CHAIN_ID] },
    types: TRANSFER_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message,
  });
  return { from: account.address, to: TO, value: value.toString(), validBefore: Number(message.validBefore), nonce: message.nonce, signature };
}

function postTransfer(transfer: RelayTransfer, client = '203.0.113.7') {
  return POST(
    new Request('http://127.0.0.1/api/relay/transfer', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': client },
      body: JSON.stringify({ chainId: DEFAULT_CHAIN_ID, transfer }),
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  resetRelayRoute();
  token = { used: false, balance: BALANCE };
  answerTokenReads();
  publicClient.estimateContractGas.mockResolvedValue(60_000n);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/relay/transfer', () => {
  it('sends today\'s signed authorization to the token, the relayer paying the gas', async () => {
    const transfer = await signedTransfer();

    const response = await postTransfer(transfer);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ hash: TX_HASH });
    const sent = walletClient.writeContract.mock.lastCall?.[0];
    expect(sent).toMatchObject({
      address: USDT_ADDRESSES[DEFAULT_CHAIN_ID],
      functionName: 'transferWithAuthorization',
      nonce: 7,
    });
    expect(sent.args.slice(0, 6)).toEqual([account.address, TO, 5_000_000n, 0n, BigInt(transfer.validBefore), transfer.nonce]);
  });

  it('refuses the day\'s second transfer before pricing or sending it', async () => {
    token.used = true;

    const response = await postTransfer(await signedTransfer());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'TRANSFER_USED' });
    expect(publicClient.estimateContractGas).not.toHaveBeenCalled();
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it('refuses more than the wallet holds', async () => {
    token.balance = 4_999_999n;

    const response = await postTransfer(await signedTransfer());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
  });

  it('refuses an authorization signed for another day without asking the chain', async () => {
    const yesterdays = { ...(await signedTransfer()), nonce: relayedTransferNonce(relayedTransferDay(NOW) - 1) };

    const response = await postTransfer(yesterdays);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'TRANSFER_WRONG_DAY' });
    expect(publicClient.readContract).not.toHaveBeenCalled();
  });

  it.each([
    ['TetherToken: auth invalid', 409, 'TRANSFER_USED'],
    ['TetherToken: invalid signature', 400, 'INVALID_SIGNATURE'],
    ['TetherToken: from is blocked', 400, 'EXECUTION_REVERTED'],
  ])('answers the token refusing with "%s" as %s %s', async (reason, status, code) => {
    publicClient.estimateContractGas.mockRejectedValue(new Error(`execution reverted: ${reason}`));

    const response = await postTransfer(await signedTransfer());

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code });
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it('says it could not price the transfer when the estimate fails without a revert', async () => {
    publicClient.estimateContractGas.mockRejectedValue(new Error('fetch failed'));

    const response = await postTransfer(await signedTransfer());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: 'RELAYER_UNAVAILABLE' });
  });

  it('refuses without sending when the day\'s transfer went out while this one waited for the lock', async () => {
    token.used = [false, true];

    const response = await postTransfer(await signedTransfer());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'TRANSFER_USED' });
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it('books the transfer against the wallet\'s daily gas budget', async () => {
    setDailyBudgetWei(1n);

    const response = await postTransfer(await signedTransfer());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ code: 'BUDGET_EXCEEDED' });
    expect(walletClient.writeContract).not.toHaveBeenCalled();
  });

  it('answers a repeated post with the first transaction instead of sending a second', async () => {
    const transfer = await signedTransfer();

    const [first, again] = await Promise.all([postTransfer(transfer), postTransfer(transfer)]);

    expect(first.status).toBe(200);
    expect(again.status).toBe(200);
    expect(walletClient.writeContract).toHaveBeenCalledOnce();
  });

  it('holds back another authorization from a wallet whose last transfer has no receipt yet', async () => {
    const gate = deferred();
    publicClient.waitForTransactionReceipt.mockImplementationOnce(async () => {
      await gate.promise;
      return minedReceipt;
    });
    const first = postTransfer(await signedTransfer());
    await vi.waitFor(() => expect(walletClient.writeContract).toHaveBeenCalledOnce());

    const second = await postTransfer(await signedTransfer(1_000_000n));

    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toMatchObject({ code: 'RELAY_PENDING' });
    gate.resolve();
    expect((await first).status).toBe(200);
  });

  it('says relaying is off when the relayer has no key', async () => {
    vi.mocked(getRelayerConfig).mockReturnValue({ ok: false, reason: 'no key' });

    const response = await postTransfer(await signedTransfer());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'RELAYER_UNAVAILABLE' });
  });
});
