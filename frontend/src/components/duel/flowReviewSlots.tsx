import type { ReactNode } from 'react';
import { FlowFundingCheck } from '@/components/duel/FlowFundingCheck';
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
}

/**
 * The balance gate's share of a create or join dialog on its review step: Continue stays closed
 * until the gate opens, and the balance line sits in the step card, with the top-up window it
 * opens over the dialog. The window reads the flow's balance, so both show one answer.
 */
export function getFlowReviewSlots({
  isReview,
  review,
  draft,
  primaryAction,
  isJoining = false,
}: FlowReviewSlotsArgs): FlowReviewSlots {
  if (!isReview) {
    return { primaryAction, stepExtra: undefined };
  }

  return {
    primaryAction: primaryAction && {
      ...primaryAction,
      disabled: primaryAction.disabled || !review.canContinue,
    },
    stepExtra: (
      <FlowFundingCheck
        review={review}
        chainId={draft.chainId}
        chainName={draft.chainName}
        neededRaw={draft.rawAmount}
        isJoining={isJoining}
      />
    ),
  };
}
