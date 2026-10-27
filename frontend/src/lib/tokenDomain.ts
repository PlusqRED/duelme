import { hashDomain, parseSignature, type Hex, type PublicClient } from 'viem';
import { erc20PermitAbi } from '@/lib/contracts';
import { PermitDomainMismatchError } from '@/lib/writeErrors';

/**
 * EIP-2612 pins its domain version to "1" — both OpenZeppelin's ERC20Permit and the USD₮0
 * deployment on Arbitrum One use it, and USD₮0 signs its EIP-3009 authorizations in the same
 * domain, so one code path covers testnet and mainnet, permits and transfers.
 */
const TOKEN_DOMAIN_VERSION = '1';

const EIP712_DOMAIN_TYPE = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
} as const;

export interface TokenDomain {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: `0x${string}`;
}

/**
 * `name()` and `DOMAIN_SEPARATOR()` are fixed for the life of a token deployment, so they are
 * read and verified once per token per session rather than on every signature.
 */
const verifiedDomains = new Map<string, TokenDomain>();

/**
 * The token's EIP-712 domain, rebuilt from `name()` + version "1" rather than read through
 * ERC-5267: mainnet USDT (USD₮0) does not implement `eip712Domain()`, and its name carries U+20AE
 * rather than an ASCII "T". Both are easy to get wrong in a way that produces a signature the
 * token silently rejects, so the reconstruction is checked against the token's own
 * DOMAIN_SEPARATOR before anything is signed in it.
 */
export async function readTokenDomain(publicClient: PublicClient, token: `0x${string}`, chainId: number): Promise<TokenDomain> {
  const cacheKey = `${chainId}:${token.toLowerCase()}`;
  const cached = verifiedDomains.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [name, onChainSeparator] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20PermitAbi, functionName: 'name' }),
    publicClient.readContract({ address: token, abi: erc20PermitAbi, functionName: 'DOMAIN_SEPARATOR' }),
  ]);

  const domain: TokenDomain = { name, version: TOKEN_DOMAIN_VERSION, chainId: BigInt(chainId), verifyingContract: token };
  if (hashDomain({ domain, types: EIP712_DOMAIN_TYPE }) !== onChainSeparator) {
    throw new PermitDomainMismatchError(token);
  }

  verifiedDomains.set(cacheKey, domain);
  return domain;
}

/** Test seam — production code never clears the verified-domain cache. */
export function resetVerifiedTokenDomains(): void {
  verifiedDomains.clear();
}

/** A signature in the token's domain as the token takes it: `v` (27 or 28), `r` and `s`. */
export function splitTokenSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  const { r, s, v, yParity } = parseSignature(signature);
  return { v: Number(v ?? BigInt(yParity + 27)), r, s };
}
