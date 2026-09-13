import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashDomain, parseSignature } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  PermitDomainMismatchError,
  resetVerifiedPermitDomains,
  signErc2612Permit,
} from '@/lib/permitSignature';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';

const ARBITRUM = SUPPORTED_CHAINS.arbitrum.id;
const USDT = SUPPORTED_CHAINS.arbitrum.usdt;
const DUELME = DUELME_ADDRESSES[ARBITRUM];

// Read off Arbitrum One: the token's real name carries U+20AE, and its DOMAIN_SEPARATOR()
// is the value an ASCII "Tether USD" reconstruction would never reproduce.
const USDT_NAME = 'USD₮0';
const USDT_DOMAIN_SEPARATOR =
  '0x566af68fb471b22d6421762f84aa7bd761c670a2e4d5c8a47d4085d5957b127c';

const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);

function publicClientStub(overrides: { name?: string; separator?: string; nonce?: bigint } = {}) {
  return {
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'name') return overrides.name ?? USDT_NAME;
      if (functionName === 'nonces') return overrides.nonce ?? 3n;
      if (functionName === 'DOMAIN_SEPARATOR') return overrides.separator ?? USDT_DOMAIN_SEPARATOR;
      throw new Error(`unexpected read ${functionName}`);
    }),
  };
}

function walletClientStub() {
  return {
    account,
    signTypedData: vi.fn(async (args: Parameters<typeof account.signTypedData>[0]) =>
      account.signTypedData(args)
    ),
  };
}

type Clients = Parameters<typeof signErc2612Permit>[0];

function args(publicClient: unknown, walletClient: unknown) {
  return {
    publicClient,
    walletClient,
    token: USDT,
    owner: account.address,
    spender: DUELME,
    value: 10_000_000n,
    chainId: ARBITRUM,
  } as unknown as Clients;
}

beforeEach(() => {
  // The verified-domain cache is per-token and lives for the session, so each case has to
  // start from a cold read — otherwise a good domain cached by one test hides a bad one.
  resetVerifiedPermitDomains();
});

describe('signErc2612Permit', () => {
  it('rebuilds the mainnet USDT domain from name() + version 1', async () => {
    // Guards the exact failure the fork test found: a domain built any other way produces a
    // signature the token rejects with no useful error.
    expect(
      hashDomain({
        domain: {
          name: USDT_NAME,
          version: '1',
          chainId: BigInt(ARBITRUM),
          verifyingContract: USDT,
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
        },
      })
    ).toBe(USDT_DOMAIN_SEPARATOR);
  });

  it('signs a permit and returns split v/r/s plus a future deadline', async () => {
    const wallet = walletClientStub();
    const before = Math.floor(Date.now() / 1000);

    const permit = await signErc2612Permit(args(publicClientStub(), wallet));

    expect(permit.deadline).toBeGreaterThan(BigInt(before));
    expect([27, 28]).toContain(permit.v);
    expect(permit.r).toMatch(/^0x[0-9a-f]{64}$/);
    expect(permit.s).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('signs the nonce the token reports, not a guess', async () => {
    const wallet = walletClientStub();

    await signErc2612Permit(args(publicClientStub({ nonce: 42n }), wallet));

    expect(wallet.signTypedData.mock.calls[0][0].message).toMatchObject({
      owner: account.address,
      spender: DUELME,
      value: 10_000_000n,
      nonce: 42n,
    });
  });

  it('refuses to sign when the rebuilt domain does not match the token', async () => {
    const wallet = walletClientStub();
    const mismatched = publicClientStub({ name: 'Tether USD' });

    await expect(signErc2612Permit(args(mismatched, wallet))).rejects.toBeInstanceOf(
      PermitDomainMismatchError
    );
    expect(wallet.signTypedData).not.toHaveBeenCalled();
  });

  it('reads name and DOMAIN_SEPARATOR once per token, but the nonce every time', async () => {
    const wallet = walletClientStub();
    const publicClient = publicClientStub();

    await signErc2612Permit(args(publicClient, wallet));
    await signErc2612Permit(args(publicClient, wallet));

    const reads = publicClient.readContract.mock.calls.map(([{ functionName }]) => functionName);

    expect(reads.filter((name) => name === 'nonces')).toHaveLength(2);
    expect(reads.filter((name) => name === 'name')).toHaveLength(1);
    expect(reads.filter((name) => name === 'DOMAIN_SEPARATOR')).toHaveLength(1);
  });

  it('produces a signature that recovers to the owner', async () => {
    const wallet = walletClientStub();

    const permit = await signErc2612Permit(args(publicClientStub(), wallet));
    const raw = await wallet.signTypedData.mock.results[0].value;

    expect(parseSignature(raw)).toMatchObject({ r: permit.r, s: permit.s });
  });
});
