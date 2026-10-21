import type { FaucetOffer } from '@/lib/faucetApi';

/** A claim followed until it shows up in the balance it was sent to: the USDT in the wallet menu, the ETH in a signing window. */
export interface FaucetFollow {
  chainId: number;
  /** That balance when the claim went out. */
  before: bigint;
}

/**
 * The faucet's flask on one network: hidden where the faucet gives nothing, ready, asking while the
 * claim is answered, sent until the claim lands, landed the moment it does, and claimed after.
 */
export type FlaskPhase = 'hidden' | 'ready' | 'asking' | 'sent' | 'landed' | 'claimed';

export function flaskPhase(
  offer: FaucetOffer,
  isClaiming: boolean,
  follow: FaucetFollow | null,
  chainId: number,
  balanceRaw: bigint | null
): FlaskPhase {
  if (offer.kind === 'none') {
    return 'hidden';
  }
  if (isClaiming) {
    return 'asking';
  }
  if (follow?.chainId === chainId) {
    return balanceRaw !== null && balanceRaw > follow.before ? 'landed' : 'sent';
  }
  return offer.kind === 'claimed' ? 'claimed' : 'ready';
}
