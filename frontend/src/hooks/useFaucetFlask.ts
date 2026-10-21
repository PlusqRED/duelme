'use client';

import { useState } from 'react';
import { useFaucetClaim } from '@/hooks/useFaucetClaim';
import { flaskPhase, type FaucetFollow } from '@/lib/faucetFlask';

/**
 * The faucet's flask on `chainId`, following `balanceRaw` (the USDT in the wallet menu, the ETH in a
 * signing window): the claim, and what the flask shows of it. A claim the faucet said yes to is
 * followed until it lands in that balance, and `settle` ends that once the money is shown pouring in.
 */
export function useFaucetFlask(chainId: number, balanceRaw: bigint | null) {
  const { offer, isClaiming, claim } = useFaucetClaim(chainId);
  const [follow, setFollow] = useState<FaucetFollow | null>(null);

  async function claimAndFollow() {
    const before = balanceRaw ?? 0n;
    if (await claim()) {
      setFollow({ chainId, before });
    }
  }

  return {
    offer,
    phase: flaskPhase(offer, isClaiming, follow, chainId, balanceRaw),
    claim: claimAndFollow,
    settle: () => setFollow(null),
  };
}

export type FaucetFlaskState = ReturnType<typeof useFaucetFlask>;
