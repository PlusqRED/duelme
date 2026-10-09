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
} from '@/lib/deposit';

export type FlowFundingView = 'review' | 'deposit';

export interface FlowFunding {
  balance: BalanceStatus;
  /** `enough` only when a fresh balance covers the wager. The flow's Continue handler checks it again. */
  status: FundingStatus;
  view: FlowFundingView;
  retry: () => void;
  showDeposit: () => void;
  showReview: () => void;
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
  onShowDeposit?: () => void;
  onShowReview?: () => void;
}

/**
 * The balance gate on the create and join review steps, and the switch between the review and the
 * top-up panel inside the same dialog. `markOpened` records when the flow opened: an answer older
 * than that — or from before the wallet last changed — never counts as enough.
 */
export function useFlowFunding({
  chainId,
  requiredRaw,
  isReviewing,
  onShowDeposit,
  onShowReview,
}: UseFlowFundingArgs) {
  const { walletAddress } = useActiveWallet();
  const [openedAt, setOpenedAt] = useState(0);
  const [view, setView] = useState<FlowFundingView>('review');
  const { read, refetch } = useUsdtBalance(chainId, walletAddress, isReviewing);

  const balance = resolveBalanceStatus(
    read,
    walletAddress ? { chainId, walletAddress } : null,
    openedAt,
  );
  const status: FundingStatus = requiredRaw === null ? { kind: 'unknown' } : resolveFunding(balance, requiredRaw);

  const markOpened = useCallback(() => {
    setOpenedAt(Date.now());
    setView('review');
  }, []);

  const showDeposit = useCallback(() => {
    onShowDeposit?.();
    setView('deposit');
  }, [onShowDeposit]);

  const showReview = useCallback(() => {
    setView('review');
    onShowReview?.();
  }, [onShowReview]);

  const funding: FlowFunding = {
    balance,
    status,
    view: isReviewing ? view : 'review',
    retry: refetch,
    showDeposit,
    showReview,
  };

  return { funding, markOpened };
}
