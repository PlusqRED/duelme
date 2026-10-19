'use client';

import { useCallback, useState } from 'react';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useUsdtBalance } from '@/hooks/useUsdtBalance';
import type { TranslationKey } from '@/i18n/translations';
import {
  type BalanceStatus,
  type FundingStatus,
  resolveBalanceStatus,
  resolveFunding,
} from '@/lib/balanceStatus';

export interface FlowFunding {
  balance: BalanceStatus;
  /** `enough` only when a fresh balance covers the wager. The flow's Continue handler checks it again. */
  status: FundingStatus;
  /** The top-up window is open over the review step. */
  isTopUpOpen: boolean;
  retry: () => void;
  openTopUp: () => void;
  closeTopUp: () => void;
}

/** What the review step of a create or join flow needs to decide whether Continue is open. */
export interface FlowReviewGate {
  funding: FlowFunding;
  /** Checked again inside the flow's Continue handler; `disabled` alone is not the gate. */
  canContinue: boolean;
  /** Why Continue is closed for a reason other than the balance, e.g. the duel stopped waiting. */
  blockedReason: TranslationKey | null;
}

interface UseFlowFundingArgs {
  chainId: number;
  /** The wager of the open flow; `null` while no flow is open. */
  requiredRaw: bigint | null;
  /** Read the balance only while the flow sits on its review step. */
  isReviewing: boolean;
  onOpenTopUp?: () => void;
  onCloseTopUp?: () => void;
}

/**
 * The balance gate on the create and join review steps, and whether the top-up window is open over
 * it. `markOpened` records when the flow opened: an answer older than that — or from before the
 * wallet last changed — never counts as enough.
 */
export function useFlowFunding({
  chainId,
  requiredRaw,
  isReviewing,
  onOpenTopUp,
  onCloseTopUp,
}: UseFlowFundingArgs) {
  const { walletAddress } = useActiveWallet();
  const [openedAt, setOpenedAt] = useState(0);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const { read, refetch } = useUsdtBalance(chainId, walletAddress, isReviewing);

  const balance = resolveBalanceStatus(
    read,
    walletAddress ? { chainId, walletAddress } : null,
    openedAt,
  );
  const status: FundingStatus = requiredRaw === null ? { kind: 'unknown' } : resolveFunding(balance, requiredRaw);

  const markOpened = useCallback(() => {
    setOpenedAt(Date.now());
    setIsTopUpOpen(false);
  }, []);

  const openTopUp = useCallback(() => {
    onOpenTopUp?.();
    setIsTopUpOpen(true);
  }, [onOpenTopUp]);

  const closeTopUp = useCallback(() => {
    setIsTopUpOpen(false);
    onCloseTopUp?.();
  }, [onCloseTopUp]);

  const funding: FlowFunding = {
    balance,
    status,
    isTopUpOpen: isReviewing && isTopUpOpen,
    retry: refetch,
    openTopUp,
    closeTopUp,
  };

  return { funding, markOpened };
}
