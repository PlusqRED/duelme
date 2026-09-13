import {
  hashDomain,
  parseSignature,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { erc20PermitAbi } from '@/lib/contracts';

/**
 * EIP-2612 pins its domain version to "1" — both OpenZeppelin's ERC20Permit and the USD₮0
 * deployment on Arbitrum One use it, so one code path covers testnet and mainnet.
 */
const PERMIT_DOMAIN_VERSION = '1';

/** Long enough to survive a slow wallet prompt, short enough that a leaked signature ages out. */
const PERMIT_VALIDITY_SECONDS = 30 * 60;

const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

const EIP712_DOMAIN_TYPE = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
} as const;

export class PermitDomainMismatchError extends Error {
  constructor(token: string) {
    super(`Token ${token} does not use the expected EIP-2612 domain.`);
    this.name = 'PermitDomainMismatchError';
  }
}

export interface PermitSignature {
  deadline: bigint;
  v: number;
  r: Hex;
  s: Hex;
}

/**
 * `name()` and `DOMAIN_SEPARATOR()` are fixed for the life of a token deployment, so they are
 * read and verified once per token per session rather than on every duel funded. Only the
 * permit nonce still has to be fetched each time.
 */
const verifiedDomains = new Map<string, { name: string; separator: `0x${string}` }>();

export interface SignPermitArgs {
  publicClient: PublicClient;
  walletClient: WalletClient<Transport, Chain | undefined, Account>;
  token: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
  value: bigint;
  chainId: number;
}

/**
 * Signs an EIP-2612 permit authorising `spender` to move `value` of `token` from `owner`.
 *
 * The domain is rebuilt from `name()` + version "1" rather than read through ERC-5267:
 * mainnet USDT (USD₮0) does not implement `eip712Domain()`, and its name carries U+20AE
 * rather than an ASCII "T". Both are easy to get wrong in a way that produces a signature
 * the token silently rejects, so the reconstruction is checked against the token's own
 * DOMAIN_SEPARATOR before anything is signed.
 */
export async function signErc2612Permit({
  publicClient,
  walletClient,
  token,
  owner,
  spender,
  value,
  chainId,
}: SignPermitArgs): Promise<PermitSignature> {
  const cacheKey = `${chainId}:${token.toLowerCase()}`;
  const cached = verifiedDomains.get(cacheKey);

  const [nonce, name, onChainSeparator] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20PermitAbi, functionName: 'nonces', args: [owner] }),
    cached?.name ??
      publicClient.readContract({ address: token, abi: erc20PermitAbi, functionName: 'name' }),
    cached?.separator ??
      publicClient.readContract({ address: token, abi: erc20PermitAbi, functionName: 'DOMAIN_SEPARATOR' }),
  ]);

  const domain = {
    name,
    version: PERMIT_DOMAIN_VERSION,
    chainId: BigInt(chainId),
    verifyingContract: token,
  } as const;

  if (hashDomain({ domain, types: EIP712_DOMAIN_TYPE }) !== onChainSeparator) {
    throw new PermitDomainMismatchError(token);
  }

  verifiedDomains.set(cacheKey, { name, separator: onChainSeparator });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + PERMIT_VALIDITY_SECONDS);

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain,
    types: PERMIT_TYPES,
    primaryType: 'Permit',
    message: { owner, spender, value, nonce, deadline },
  });

  const { r, s, v, yParity } = parseSignature(signature);

  return { deadline, r, s, v: Number(v ?? BigInt(yParity + 27)) };
}

/** Test seam — production code never clears the verified-domain cache. */
export function resetVerifiedPermitDomains(): void {
  verifiedDomains.clear();
}
