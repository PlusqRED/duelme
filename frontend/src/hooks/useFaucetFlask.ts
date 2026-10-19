'use client';

import { useCallback, useState } from 'react';
import { useFaucetClaim } from '@/hooks/useFaucetClaim';
import { flaskPhase, type FaucetFollow } from '@/lib/faucetApi';

/**
 * The wallet menu's faucet on `chainId`, whose USDT reads `usdtRaw`: the claim, and what the flask
 * shows of it. A claim the faucet said yes to is followed until its USDT lands in the balance, and
 * `settle` ends that once the menu has shown the money pour in.
 */
export function useFaucetFlask(chainId: number, usdtRaw: bigint | null) {
  const { offer, isClaiming, claim } = useFaucetClaim(chainId);
  const [follow, setFollow] = useState<FaucetFollow | null>(null);

  const claimAndFollow = useCallback(async () => {
    const usdtBefore = usdtRaw ?? 0n;
    if (await claim()) {
      setFollow({ chainId, usdtBefore });
    }
  }, [claim, chainId, usdtRaw]);

  const settle = useCallback(() => setFollow(null), []);

  return {
    offer,
    phase: flaskPhase(offer, isClaiming, follow, chainId, usdtRaw),
    claim: claimAndFollow,
    settle,
  };
}

export type FaucetFlaskState = ReturnType<typeof useFaucetFlask>;
