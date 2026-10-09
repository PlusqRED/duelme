import type { ReactNode } from 'react';
import { FlowFundingCheck } from '@/components/duel/FlowFundingCheck';
import { DepositPanel } from '@/components/wallet/DepositPanel';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import type { GuidedTransactionAction } from '@/lib/guidedTransaction';

interface FlowReviewSlotsArgs {
  isReview: boolean;
  review: FlowReviewGate;
  draft: { chainId: number; chainName: string; rawAmount: bigint };
  primaryAction: GuidedTransactionAction | undefined;
  isJoining?: boolean;
}

interface FlowReviewSlots {
  primaryAction: GuidedTransactionAction | undefined;
  stepExtra: ReactNode;
  stepPanel: ReactNode;
}

/**
 * The balance gate's share of a create or join dialog on its review step: Continue stays closed
 * until the gate opens, the balance line sits in the step card, and the top-up panel replaces the
 * step while the player tops up. The panel reads the flow's balance, so both show one answer.
 */
export function getFlowReviewSlots({
  isReview,
  review,
  draft,
  primaryAction,
  isJoining = false,
}: FlowReviewSlotsArgs): FlowReviewSlots {
  if (!isReview) {
    return { primaryAction, stepExtra: undefined, stepPanel: undefined };
  }

  const { funding } = review;
  return {
    primaryAction: primaryAction && { ...primaryAction, disabled: !review.canContinue },
    stepExtra: <FlowFundingCheck review={review} chainName={draft.chainName} />,
    stepPanel: funding.view === 'deposit' ? (
      <DepositPanel
        chainId={draft.chainId}
        requiredRaw={draft.rawAmount}
        isJoining={isJoining}
        onBack={funding.showReview}
        flowBalance={funding}
      />
    ) : undefined,
  };
}
