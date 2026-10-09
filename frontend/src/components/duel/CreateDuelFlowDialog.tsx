'use client';

import { useTranslation } from '@/i18n/useTranslation';
import {
  getCreateDuelFlowSteps,
  type CreateDuelFlowActionState,
  type CreateDuelFlowDraft,
  type CreateDuelFlowStage,
} from '@/lib/createDuelFlow';
import {
  getCreateDuelDialogConfig,
  getCreateDuelStepLabelKey,
} from '@/components/duel/createDuelFlowDialogContent';
import { formatUSDT } from '@/lib/utils';
import { getFlowReviewSlots } from '@/components/duel/flowReviewSlots';
import { GuidedTransactionDialog } from '@/components/duel/GuidedTransactionDialog';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import type {
  GuidedTransactionAction,
  GuidedTransactionDetailItem,
  GuidedTransactionSummaryItem,
  GuidedTransactionStepView,
} from '@/lib/guidedTransaction';

interface CreateDuelFlowDialogProps {
  open: boolean;
  canClose: boolean;
  draft: CreateDuelFlowDraft | null;
  stage: CreateDuelFlowStage;
  actionState: CreateDuelFlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  completedSwitchNetwork: boolean;
  completedApproval: boolean;
  errorMessage?: string | null;
  review: FlowReviewGate;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onApprove: () => void;
  onCreateDuel: () => void;
  onBackToForm: () => void;
}

export function CreateDuelFlowDialog({
  open,
  canClose,
  draft,
  stage,
  actionState,
  needsNetworkSwitch,
  needsApproval,
  completedSwitchNetwork,
  completedApproval,
  errorMessage,
  review,
  onOpenChange,
  onContinue,
  onSwitchNetwork,
  onApprove,
  onCreateDuel,
  onBackToForm,
}: CreateDuelFlowDialogProps) {
  const { t } = useTranslation();

  if (!draft) {
    return null;
  }

  const formattedAmount = `${formatUSDT(draft.rawAmount)} USDT`;
  const formattedPot = `${formatUSDT(draft.rawAmount * 2n)} USDT`;
  const walletConfirmationCount =
    1 + Number(needsNetworkSwitch) + Number(needsApproval);

  const steps: GuidedTransactionStepView[] = getCreateDuelFlowSteps({
    stage,
    actionState,
    needsNetworkSwitch,
    needsApproval,
    completedSwitchNetwork,
    completedApproval,
  }).map((step) => ({
    id: step.id,
    status: step.status,
    label: t(getCreateDuelStepLabelKey(step.id)),
  }));

  const summaryItems: GuidedTransactionSummaryItem[] = [
    {
      label: t('create.amount'),
      value: formattedAmount,
      emphasize: true,
    },
    {
      label: t('create.pot'),
      value: formattedPot,
      emphasize: true,
    },
    {
      label: t('create.chain'),
      value: draft.chainName,
    },
    {
      label: t('create.duelType'),
      value: draft.isPublic ? t('create.public') : t('create.private'),
    },
    {
      label: t('create.flow.summary.walletConfirmations'),
      value: t(getWalletConfirmationCountKey(walletConfirmationCount)),
    },
  ];

  if (draft.gameName.trim()) {
    summaryItems.push({
      label: t('create.game'),
      value: draft.gameName.trim(),
    });
  }

  if (draft.message.trim()) {
    summaryItems.push({
      label: t('create.message'),
      value: draft.message.trim(),
    });
  }

  const technicalDetails: GuidedTransactionDetailItem[] = [
    {
      label: t('create.flow.detail.network'),
      value: draft.chainName,
    },
    {
      label: t('create.flow.detail.token'),
      value: 'USDT',
    },
    {
      label: t('create.flow.detail.approvalAmount'),
      value: formattedAmount,
    },
    {
      label: t('create.flow.detail.spender'),
      value: draft.contractAddress,
      monospace: true,
    },
    {
      label: t('create.flow.detail.tokenAddress'),
      value: draft.usdtAddress,
      monospace: true,
    },
  ];

  const secondaryAction: GuidedTransactionAction | undefined =
    stage === 'success' || actionState === 'awaiting-wallet' || actionState === 'confirming'
      ? undefined
      : {
          label: t('create.flow.action.backToForm'),
          onClick: onBackToForm,
          variant: 'outline',
        };

  const config = getCreateDuelDialogConfig({
    actionState,
    chainName: draft.chainName,
    formattedAmount,
    needsApproval,
    needsNetworkSwitch,
    onApprove,
    onContinue,
    onCreateDuel,
    onSwitchNetwork,
    stage,
    t,
  });

  const { primaryAction, stepExtra, stepPanel } = getFlowReviewSlots({
    isReview: stage === 'review',
    review,
    draft,
    primaryAction: config.primaryAction,
  });

  return (
    <GuidedTransactionDialog
      open={open}
      onOpenChange={onOpenChange}
      canClose={canClose}
      title={t('create.flow.title')}
      description={t('create.flow.description')}
      steps={steps}
      currentStepLabel={config.stepLabel}
      currentStepTitle={config.title}
      currentStepDescription={config.description}
      currentStepHint={config.hint}
      currentIcon={config.icon}
      summaryTitle={t('create.flow.summaryTitle')}
      summaryItems={summaryItems}
      technicalDetailsLabel={t('create.flow.technicalDetails')}
      technicalDetails={technicalDetails}
      errorMessage={errorMessage ?? undefined}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      success={stage === 'success'}
      footerContent={t('create.flow.footer')}
      stepExtra={stepExtra}
      stepPanel={stepPanel}
    />
  );
}

function getWalletConfirmationCountKey(count: number) {
  if (count <= 1) {
    return 'create.flow.walletConfirmations.one';
  }

  if (count === 2) {
    return 'create.flow.walletConfirmations.two';
  }

  return 'create.flow.walletConfirmations.three';
}
