import {
  parseSignature,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { erc20PermitAbi } from '@/lib/contracts';
import { readTokenDomain } from '@/lib/tokenDomain';

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

export interface PermitSignature {
  deadline: bigint;
  v: number;
  r: Hex;
  s: Hex;
}

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
 * Signs an EIP-2612 permit authorising `spender` to move `value` of `token` from `owner`, in the
 * token's domain as `readTokenDomain` rebuilds and checks it. Only the permit nonce is read on
 * every permit; the domain once per token.
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
  const [nonce, domain] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20PermitAbi, functionName: 'nonces', args: [owner] }),
    readTokenDomain(publicClient, token, chainId),
  ]);

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
