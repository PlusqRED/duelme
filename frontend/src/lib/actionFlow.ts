import type { LucideIcon } from 'lucide-react';
import type { GuidedFlowActionState, GuidedTransactionStepState, GuidedTransactionSummaryItem } from '@/lib/guidedTransaction';
import { getOptionalStepStatus } from '@/lib/guidedFlowSteps';
import type { TranslationKey } from '@/i18n/translations';
import type { useTranslation } from '@/i18n/useTranslation';

export type ActionFlowStage = 'review' | 'switch-network' | 'execute' | 'success';

export type ActionFlowType =
  | 'claimVictory'
  | 'admitDefeat'
  | 'confirmResult'
  | 'disputeResult'
  | 'requestMutualCancellation'
  | 'claimPayout'
  | 'refund'
  | 'claimAll'
  | 'refundAndClaim'
  | 'refundAndClaimAll';

export interface ActionFlowSession {
  actionType: ActionFlowType;
  duelId: bigint;
  chainId: number;
  chainName: string;
  stage: ActionFlowStage;
  actionState: GuidedFlowActionState;
  errorMessage: string | null;
  pendingTransaction: boolean;
  completedSwitchNetwork: boolean;
}

export interface ActionFlowSummaryContext {
  duelId: number;
  formattedWager: string;
  formattedPot: string;
  chainName: string;
  opponentDisplay: string;
  claimedWinnerDisplay: string;
  claimableDisplay: string;
  t: ReturnType<typeof useTranslation>['t'];
}

export interface ActionFlowLabels {
  dialogTitle: TranslationKey;
  dialogDescription: TranslationKey;
  reviewTitle: TranslationKey;
  reviewDescription: TranslationKey;
  reviewHint: TranslationKey;
  reviewHintSwitch: TranslationKey;
  executeTitle: TranslationKey;
  executeDescription: TranslationKey;
  executeHint: TranslationKey;
  executeButton: TranslationKey;
  successTitle: TranslationKey;
  successDescription: TranslationKey;
  successHint: TranslationKey;
}

export interface ActionFlowConfig {
  type: ActionFlowType;
  execute: () => void;
  onSuccess?: () => void;
  icon: LucideIcon;
  labels: ActionFlowLabels;
  summaryItems: (ctx: ActionFlowSummaryContext) => GuidedTransactionSummaryItem[];
}

export function getActionFlowSteps(options: {
  stage: ActionFlowStage;
  actionState: GuidedFlowActionState;
  needsNetworkSwitch: boolean;
  completedSwitchNetwork: boolean;
}): { id: ActionFlowStage; status: GuidedTransactionStepState }[] {
  const switchStatus = getOptionalStepStatus({
    stage: options.stage,
    actionState: options.actionState,
    stepId: 'switch-network',
    isRequired: options.needsNetworkSwitch,
    completedInFlow: options.completedSwitchNetwork,
    completedStages: ['execute', 'success'],
  });

  const executeStatus =
    options.stage === 'success'
      ? 'completed'
      : options.stage === 'execute'
        ? options.actionState === 'error'
          ? 'error'
          : 'active'
        : 'upcoming';

  return [
    { id: 'review', status: options.stage === 'review' ? 'active' : 'completed' },
    { id: 'switch-network', status: switchStatus },
    { id: 'execute', status: executeStatus },
    { id: 'success', status: options.stage === 'success' ? 'active' : 'upcoming' },
  ];
}
