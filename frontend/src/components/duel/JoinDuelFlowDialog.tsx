'use client';

import { useTranslation } from '@/i18n/useTranslation';
import {
  getJoinDuelFlowSteps,
  type JoinDuelFlowActionState,
  type JoinDuelFlowDraft,
  type JoinDuelFlowStage,
} from '@/lib/joinDuelFlow';
import {
  getJoinDuelDialogConfig,
  getJoinDuelStepLabelKey,
} from '@/components/duel/joinDuelFlowDialogContent';
import { formatUSDT, truncateAddress } from '@/lib/utils';
import { GuidedTransactionDialog } from '@/components/duel/GuidedTransactionDialog';
import type {
  GuidedTransactionAction,
  GuidedTransactionDetailItem,
  GuidedTransactionSummaryItem,
  GuidedTransactionStepView,
} from '@/lib/guidedTransaction';

interface JoinDuelFlowDialogProps {
  open: boolean;
  canClose: boolean;
  draft: JoinDuelFlowDraft | null;
  stage: JoinDuelFlowStage;
  actionState: JoinDuelFlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  completedSwitchNetwork: boolean;
  completedApproval: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onApprove: () => void;
  onJoinDuel: () => void;
  onDone: () => void;
}

export function JoinDuelFlowDialog({
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
  onOpenChange,
  onContinue,
  onSwitchNetwork,
  onApprove,
  onJoinDuel,
  onDone,
}: JoinDuelFlowDialogProps) {
  const { t } = useTranslation();

  if (!draft) {
    return null;
  }

  const formattedAmount = `${formatUSDT(draft.rawAmount)} USDT`;
  const formattedPot = `${formatUSDT(draft.rawAmount * 2n)} USDT`;
  const walletConfirmationCount =
    1 + Number(needsNetworkSwitch) + Number(needsApproval);

  const steps: GuidedTransactionStepView[] = getJoinDuelFlowSteps({
    stage,
    actionState,
    needsNetworkSwitch,
    needsApproval,
    completedSwitchNetwork,
    completedApproval,
  }).map((step) => ({
    id: step.id,
    status: step.status,
    label: t(getJoinDuelStepLabelKey(step.id)),
  }));

  const summaryItems: GuidedTransactionSummaryItem[] = [
    {
      label: t('join.flow.summary.duelId'),
      value: `#${String(draft.duelId)}`,
    },
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
      label: t('join.flow.summary.creator'),
      value: truncateAddress(draft.creatorAddress),
    },
    {
      label: t('create.flow.summary.walletConfirmations'),
      value: t(getWalletConfirmationCountKey(walletConfirmationCount)),
    },
  ];

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
          label: t('join.flow.action.cancel'),
          onClick: () => onOpenChange(false),
          variant: 'outline',
        };

  const config = getJoinDuelDialogConfig({
    actionState,
    chainName: draft.chainName,
    formattedAmount,
    needsApproval,
    needsNetworkSwitch,
    onApprove,
    onContinue,
    onJoinDuel,
    onSwitchNetwork,
    onDone,
    stage,
    t,
  });

  return (
    <GuidedTransactionDialog
      open={open}
      onOpenChange={onOpenChange}
      canClose={canClose}
      title={t('join.flow.title')}
      description={t('join.flow.description')}
      steps={steps}
      currentStepLabel={config.stepLabel}
      currentStepTitle={config.title}
      currentStepDescription={config.description}
      currentStepHint={config.hint}
      currentIcon={config.icon}
      summaryTitle={t('join.flow.summaryTitle')}
      summaryItems={summaryItems}
      technicalDetailsLabel={t('create.flow.technicalDetails')}
      technicalDetails={technicalDetails}
      errorMessage={errorMessage ?? undefined}
      primaryAction={config.primaryAction}
      secondaryAction={secondaryAction}
      success={stage === 'success'}
      footerContent={t('join.flow.footer')}
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
