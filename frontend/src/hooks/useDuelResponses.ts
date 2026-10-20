'use client';

import { useEffect, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useAppToast } from '@/hooks/useAppToast';
import { useDuelActions } from '@/hooks/useDuelActions';
import type { TranslationKey } from '@/i18n/translations';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import type { Duel } from '@/lib/contracts';
import { canPresentInvite, OPEN_DUEL_INVITE_SECRET } from '@/lib/invite';

export type PendingResponse =
  | 'idle'
  | 'declining'
  | 'canceling'
  | 'acceptingMutualCancel'
  | 'decliningMutualCancelRequest'
  | 'withdrawingMutualCancelRequest';

const successToasts: Partial<Record<PendingResponse, TranslationKey>> = {
  acceptingMutualCancel: 'toast.cancellationAccepted',
  decliningMutualCancelRequest: 'toast.cancellationDeclined',
  withdrawingMutualCancelRequest: 'toast.cancellationWithdrawn',
};

/**
 * The answers a player gives a duel straight from its page, each one transaction without a guided
 * window: declining or cancelling a duel nobody joined, and answering a request to call it off.
 * Each switches the wallet to the duel's network first and says how it went.
 */
export function useDuelResponses(duelId: number, duel: Duel | undefined, inviteSecret: `0x${string}` | null, refetch: () => unknown) {
  const appToast = useAppToast();
  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();
  const {
    declineDuel,
    cancelDuel,
    acceptMutualCancellation,
    declineMutualCancellation,
    withdrawMutualCancellationRequest,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  } = useDuelActions(DEFAULT_CHAIN_ID);
  // The answer last sent; it is pending only while its transaction is.
  const [sent, setSent] = useState<Exclude<PendingResponse, 'idle'> | null>(null);
  const isBusy = isPending || isConfirming;
  const duelMeAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID] ?? ZERO_ADDRESS;

  useEffect(() => {
    if (!isSuccess || !sent) return;
    appToast.success(successToasts[sent] ?? 'toast.transactionConfirmed');
    refetch();
    reset();
  }, [isSuccess, sent, reset, appToast, refetch]);

  useEffect(() => {
    if (error) appToast.transactionError(error);
  }, [error, appToast]);

  async function ensureChain() {
    if (connectedChainId === DEFAULT_CHAIN_ID) return true;
    appToast.info('toast.switchingNetwork', { chain: DEFAULT_CHAIN.name });
    try {
      await switchChainAsync({ chainId: DEFAULT_CHAIN_ID });
      return true;
    } catch {
      appToast.error('toast.switchNetworkFailed', { chain: DEFAULT_CHAIN.name });
      return false;
    }
  }

  async function decline() {
    if (!duel) return;
    if (!canPresentInvite(inviteSecret, duel.inviteHash, duelMeAddress, DEFAULT_CHAIN_ID)) {
      appToast.error('duel.privateInviteMissing');
      return;
    }
    if (!(await ensureChain())) return;
    setSent('declining');
    appToast.info('toast.decliningDuel');
    declineDuel(BigInt(duelId), inviteSecret ?? OPEN_DUEL_INVITE_SECRET);
  }

  async function cancel() {
    if (!(await ensureChain())) return;
    setSent('canceling');
    appToast.info('toast.cancellingDuel');
    cancelDuel(BigInt(duelId));
  }

  async function acceptCancellation() {
    if (!(await ensureChain())) return;
    setSent('acceptingMutualCancel');
    appToast.info('toast.acceptingCancellation');
    acceptMutualCancellation(BigInt(duelId));
  }

  async function declineCancellation() {
    if (!(await ensureChain())) return;
    setSent('decliningMutualCancelRequest');
    appToast.info('toast.decliningCancellation');
    declineMutualCancellation(BigInt(duelId));
  }

  async function withdrawCancellation() {
    if (!(await ensureChain())) return;
    setSent('withdrawingMutualCancelRequest');
    appToast.info('toast.withdrawingCancellation');
    withdrawMutualCancellationRequest(BigInt(duelId));
  }

  return {
    pending: (isBusy && sent) || 'idle',
    isBusy,
    decline,
    cancel,
    acceptCancellation,
    declineCancellation,
    withdrawCancellation,
  };
}
