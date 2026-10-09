'use client';

import { useCallback, useState } from 'react';
import { useIdentityToken } from '@privy-io/react-auth';
import { useAppToast } from '@/hooks/useAppToast';
import { useIsNonProductionHost } from '@/hooks/useIsNonProductionHost';
import { TESTNET_CHAIN_IDS } from '@/lib/constants';
import { emitBalanceRefreshBurst } from '@/lib/balanceRefresh';
import { FaucetClaimError, claimFaucet } from '@/lib/faucetApi';

/**
 * The testnet faucet: available on non-production hosts for testnet chains only. One claim per
 * wallet per token — a MockUSDT redeploy re-opens it. Every refusal is a toast naming the reason;
 * nothing here promises that funds will arrive.
 */
export function useFaucetClaim(chainId: number) {
  const appToast = useAppToast();
  const { identityToken } = useIdentityToken();
  const isNonProdHost = useIsNonProductionHost();
  const [isClaiming, setIsClaiming] = useState(false);
  const canClaim = isNonProdHost && TESTNET_CHAIN_IDS.has(chainId);

  const claim = useCallback(async () => {
    if (!canClaim) return;
    if (!identityToken) {
      appToast.error('toast.walletNotReady');
      return;
    }
    setIsClaiming(true);
    try {
      await claimFaucet(identityToken);
      appToast.success('toast.faucetClaimed');
      emitBalanceRefreshBurst();
    } catch (err) {
      if (err instanceof FaucetClaimError) {
        switch (err.code) {
          case 'already-claimed': appToast.error('toast.faucetAlreadyClaimed'); break;
          case 'disabled':        appToast.error('toast.faucetDisabled'); break;
          case 'execution-failed':appToast.error('toast.faucetExecutionFailed'); break;
          case 'unauthorized':    appToast.error('toast.walletNotReady'); break;
          default:                appToast.error('toast.faucetFailed'); break;
        }
      } else {
        appToast.error('toast.faucetFailed');
      }
    } finally {
      setIsClaiming(false);
    }
  }, [canClaim, identityToken, appToast]);

  return { canClaim, isClaiming, claim };
}
