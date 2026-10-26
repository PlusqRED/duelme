import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicClient } from 'viem';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { readTokenDomain, resetVerifiedTokenDomains } from '@/lib/tokenDomain';
import { PermitDomainMismatchError } from '@/lib/writeErrors';

const ARBITRUM = SUPPORTED_CHAINS.arbitrum.id;
const USDT = SUPPORTED_CHAINS.arbitrum.usdt;
// Read off Arbitrum One, where the same domain signs USD₮0's permits and its transfer authorizations.
const USDT_DOMAIN_SEPARATOR = '0x566af68fb471b22d6421762f84aa7bd761c670a2e4d5c8a47d4085d5957b127c';

function publicClientStub(name = 'USD₮0') {
  const readContract = vi.fn(async ({ functionName }: { functionName: string }) =>
    functionName === 'name' ? name : USDT_DOMAIN_SEPARATOR
  );
  return { client: { readContract } as unknown as PublicClient, readContract };
}

beforeEach(() => {
  resetVerifiedTokenDomains();
});

describe('readTokenDomain', () => {
  it('rebuilds mainnet USD₮0\'s domain from name() and version 1', async () => {
    const { client } = publicClientStub();

    await expect(readTokenDomain(client, USDT, ARBITRUM)).resolves.toEqual({
      name: 'USD₮0',
      version: '1',
      chainId: BigInt(ARBITRUM),
      verifyingContract: USDT,
    });
  });

  it('refuses a domain that does not hash to the token\'s own separator', async () => {
    const { client } = publicClientStub('Tether USD');

    await expect(readTokenDomain(client, USDT, ARBITRUM)).rejects.toBeInstanceOf(PermitDomainMismatchError);
  });

  it('reads a token once per session', async () => {
    const { client, readContract } = publicClientStub();

    await readTokenDomain(client, USDT, ARBITRUM);
    await readTokenDomain(client, USDT, ARBITRUM);

    expect(readContract).toHaveBeenCalledTimes(2);
  });
});
