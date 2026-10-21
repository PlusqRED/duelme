'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIdentityToken } from '@privy-io/react-auth';
import { useAppToast } from '@/hooks/useAppToast';
import { FAUCET_STATUS_KEY, useFaucetStatus } from '@/hooks/useFaucetStatus';
import { emitBalanceRefreshBurst } from '@/lib/balanceRefresh';
import { FaucetClaimError, claimFaucet, faucetOffer } from '@/lib/faucetApi';

/**
 * The testnet faucet on `chainId`: what it offers there, by the backend's status, and the claim.
 * One claim per wallet per token — a MockUSDT redeploy re-opens it. Every refusal is a toast naming
 * the reason; a claim that went through says only that the money is on its way.
 */
export function useFaucetClaim(chainId: number) {
  const appToast = useAppToast();
  const queryClient = useQueryClient();
  const { identityToken } = useIdentityToken();
  const { data: status } = useFaucetStatus();
  const [isClaiming, setIsClaiming] = useState(false);
  const offer = faucetOffer(status, chainId);

  const claim = useCallback(async (): Promise<boolean> => {
    if (offer.kind !== 'ready') return false;
    if (!identityToken) {
      appToast.error('toast.walletNotReady');
      return false;
    }
    setIsClaiming(true);
    try {
      await claimFaucet(identityToken);
      emitBalanceRefreshBurst();
      return true;
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
      return false;
    } finally {
      setIsClaiming(false);
      void queryClient.invalidateQueries({ queryKey: [FAUCET_STATUS_KEY] });
    }
  }, [offer.kind, identityToken, appToast, queryClient]);

  return { offer, isClaiming, claim };
}
