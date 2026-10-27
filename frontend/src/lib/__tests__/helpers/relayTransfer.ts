import { privateKeyToAccount } from 'viem/accounts';
import { toRelayTransfer, TRANSFER_AUTHORIZATION_TYPES, transferAuthorization, type RelayTransfer } from '@/lib/relayedTransfer';

/** The wallet that signs the suites' relayed transfers, and where they go. */
export const transferSigner = privateKeyToAccount(`0x${'11'.repeat(32)}`);
export const TRANSFER_TO = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';

/** USD₮0's EIP-712 domain for `token` on `chainId`: its name, U+20AE included, and version 1. */
export function usdtDomain(chainId: number, token: `0x${string}`) {
  return { name: 'USD₮0', version: '1', chainId: BigInt(chainId), verifyingContract: token } as const;
}

interface SignedTransferSetup {
  chainId: number;
  token: `0x${string}`;
  nowMs: number;
  value?: bigint;
}

/** `transferSigner`'s authorization to send `value` to `TRANSFER_TO` at `nowMs`, signed and in its wire shape. */
export async function signTransfer({ chainId, token, nowMs, value = 5_000_000n }: SignedTransferSetup): Promise<RelayTransfer> {
  const authorization = transferAuthorization(transferSigner.address, TRANSFER_TO, value, nowMs);
  const signature = await transferSigner.signTypedData({
    domain: usdtDomain(chainId, token),
    types: TRANSFER_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });
  return toRelayTransfer(authorization, signature);
}
