import { describe, expect, it, vi } from 'vitest';
import { decodeFunctionData, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import { MAX_RELAY_REQUEST_GAS } from '@/lib/relayRequest';
import { buildSignedForwardRequest, FORWARDER_NAME, relayedCallGas } from '@/lib/forwardRequest';

const CHAIN_ID = SUPPORTED_CHAINS.arbitrum.id;
const DUELME = DUELME_ADDRESSES[CHAIN_ID];
const FORWARDER = '0x1111111111111111111111111111111111111111' as const;
const INVITE_HASH = `0x${'22'.repeat(32)}` as const;

const account = privateKeyToAccount(`0x${'33'.repeat(32)}`);

const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
  ],
} as const;

function clients({ estimate = 200_000n, nonce = 7n } = {}) {
  const publicClient = {
    estimateGas: vi.fn(async () => estimate),
    readContract: vi.fn(async () => nonce),
  };
  const walletClient = {
    account,
    signTypedData: vi.fn(async (args: Parameters<typeof account.signTypedData>[0]) =>
      account.signTypedData(args)
    ),
  };
  return { publicClient, walletClient };
}

type BuildArgs = Parameters<typeof buildSignedForwardRequest>[0];

function build(publicClient: unknown, walletClient: unknown) {
  return buildSignedForwardRequest({
    publicClient,
    walletClient,
    forwarderAddress: FORWARDER,
    chainId: CHAIN_ID,
    from: account.address,
    to: DUELME,
    abi: duelMeAbi,
    functionName: 'joinDuel',
    args: [0n, INVITE_HASH],
  } as unknown as BuildArgs);
}

describe('buildSignedForwardRequest', () => {
  it('produces a request the forwarder can recover the signer from', async () => {
    const { publicClient, walletClient } = clients();
    const request = await build(publicClient, walletClient);

    const recovered = await recoverTypedDataAddress({
      domain: {
        name: FORWARDER_NAME,
        version: '1',
        chainId: BigInt(CHAIN_ID),
        verifyingContract: FORWARDER,
      },
      types: FORWARD_REQUEST_TYPES,
      primaryType: 'ForwardRequest',
      message: {
        from: request.from,
        to: request.to,
        value: 0n,
        gas: BigInt(request.gas),
        nonce: 7n,
        deadline: request.deadline,
        data: request.data,
      },
      signature: request.signature,
    });

    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it('signs the forwarder nonce without putting it on the wire', async () => {
    const { publicClient, walletClient } = clients({ nonce: 12n });
    const request = await build(publicClient, walletClient);

    expect(walletClient.signTypedData.mock.calls[0][0].message).toMatchObject({ nonce: 12n });
    expect(request).not.toHaveProperty('nonce');
  });

  it('encodes the call it was asked for', async () => {
    const { publicClient, walletClient } = clients();
    const request = await build(publicClient, walletClient);

    expect(decodeFunctionData({ abi: duelMeAbi, data: request.data })).toMatchObject({
      functionName: 'joinDuel',
    });
  });

  it('sends value as "0" and a deadline in the near future', async () => {
    const { publicClient, walletClient } = clients();
    const request = await build(publicClient, walletClient);

    expect(request.value).toBe('0');
    expect(request.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(request.deadline).toBeLessThan(Math.floor(Date.now() / 1000) + 3600);
  });

  it('pads the estimate so the forwarded call is not starved', async () => {
    const { publicClient, walletClient } = clients({ estimate: 200_000n });
    const request = await build(publicClient, walletClient);

    expect(BigInt(request.gas)).toBeGreaterThan(200_000n);
  });
});

describe('relayedCallGas', () => {
  it('adds headroom over the estimate', () => {
    expect(relayedCallGas(100_000n)).toBe(150_000n);
  });

  it('never exceeds what the relayer will accept', () => {
    expect(relayedCallGas(10_000_000n)).toBe(MAX_RELAY_REQUEST_GAS);
  });

  it('stays usable for a tiny estimate', () => {
    expect(relayedCallGas(21_000n)).toBeGreaterThan(21_000n);
  });
});
