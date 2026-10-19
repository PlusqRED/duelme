import type { FaucetOffer } from '@/lib/faucetApi';

/** A claim the wallet menu follows until its USDT shows up in the balance it was sent to. */
export interface FaucetFollow {
  chainId: number;
  /** The network's USDT when the claim went out. */
  usdtBefore: bigint;
}

/**
 * The faucet's flask on one network: hidden where the faucet gives nothing, ready, asking while the
 * claim is answered, sent until the USDT lands, landed the moment it does, and claimed after.
 */
export type FlaskPhase = 'hidden' | 'ready' | 'asking' | 'sent' | 'landed' | 'claimed';

export function flaskPhase(
  offer: FaucetOffer,
  isClaiming: boolean,
  follow: FaucetFollow | null,
  chainId: number,
  usdtRaw: bigint | null
): FlaskPhase {
  if (offer.kind === 'none') {
    return 'hidden';
  }
  if (isClaiming) {
    return 'asking';
  }
  if (follow?.chainId === chainId) {
    return usdtRaw !== null && usdtRaw > follow.usdtBefore ? 'landed' : 'sent';
  }
  return offer.kind === 'claimed' ? 'claimed' : 'ready';
}
