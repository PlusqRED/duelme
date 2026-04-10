'use client';

import { Sparkles, Waypoints } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { getActionFlowSteps, type ActionFlowConfig, type ActionFlowSession, type ActionFlowSummaryContext } from '@/lib/actionFlow';
import { buildFlowAction, type GuidedTransactionAction, type GuidedTransactionDialogConfig, type GuidedTransactionStepView } from '@/lib/guidedTransaction';
import { GuidedTransactionDialog } from '@/components/duel/GuidedTransactionDialog';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';

interface ActionFlowDialogProps {
  open: boolean;
  canClose: boolean;
  flow: ActionFlowSession | null;
  config: ActionFlowConfig | null;
  needsNetworkSwitch: boolean;
  summaryContext: ActionFlowSummaryContext;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onExecute: () => void;
  onDone: () => void;
}

export function ActionFlowDialog({
  open,
  canClose,
  flow,
  config,
  needsNetworkSwitch,
  summaryContext,
  onOpenChange,
  onContinue,
  onSwitchNetwork,
  onExecute,
  onDone,
}: ActionFlowDialogProps) {
  const { t } = useTranslation();

  if (!flow || !config) return null;

  const chainConfig = SUPPORTED_CHAINS.arbitrumSepolia;
  const contractAddress = DUELME_ADDRESSES[chainConfig.id];

  const steps: GuidedTransactionStepView[] = getActionFlowSteps({
    stage: flow.stage,
    actionState: flow.actionState,
    needsNetworkSwitch,
    completedSwitchNetwork: flow.completedSwitchNetwork,
  }).map((step) => ({
    id: step.id,
    status: step.status,
    label: t(
      step.id === 'review' ? 'actionFlow.step.review'
        : step.id === 'switch-network' ? 'create.flow.step.network'
          : step.id === 'execute' ? 'actionFlow.step.execute'
            : 'actionFlow.step.success'
    ),
  }));

  const dialogConfig = getDialogConfig(flow, config, needsNetworkSwitch, onContinue, onSwitchNetwork, onExecute, onDone, t);

  const secondaryAction: GuidedTransactionAction | undefined =
    flow.stage === 'success' || flow.actionState === 'awaiting-wallet' || flow.actionState === 'confirming'
      ? undefined
      : { label: t('actionFlow.action.cancel'), onClick: () => onOpenChange(false), variant: 'outline' };

  return (
    <GuidedTransactionDialog
      open={open}
      onOpenChange={onOpenChange}
      canClose={canClose}
      title={t(config.labels.dialogTitle)}
      description={t(config.labels.dialogDescription)}
      steps={steps}
      currentStepLabel={dialogConfig.stepLabel}
      currentStepTitle={dialogConfig.title}
      currentStepDescription={dialogConfig.description}
      currentStepHint={dialogConfig.hint}
      currentIcon={dialogConfig.icon}
      summaryTitle={t(config.labels.dialogTitle)}
      summaryItems={config.summaryItems(summaryContext)}
      technicalDetailsLabel={t('actionFlow.technicalDetails')}
      technicalDetails={[
        { label: t('create.flow.detail.network'), value: flow.chainName },
        { label: t('create.flow.detail.spender'), value: contractAddress, monospace: true },
      ]}
      errorMessage={flow.errorMessage ?? undefined}
      primaryAction={dialogConfig.primaryAction}
      secondaryAction={secondaryAction}
      success={flow.stage === 'success'}
    />
  );
}

function getDialogConfig(
  flow: ActionFlowSession,
  config: ActionFlowConfig,
  needsNetworkSwitch: boolean,
  onContinue: () => void,
  onSwitchNetwork: () => void,
  onExecute: () => void,
  onDone: () => void,
  t: ReturnType<typeof useTranslation>['t'],
): GuidedTransactionDialogConfig {
  const labels = config.labels;

  if (flow.stage === 'review') {
    return {
      stepLabel: t('actionFlow.step.review'),
      title: t(labels.reviewTitle),
      description: t(labels.reviewDescription),
      hint: t(needsNetworkSwitch ? labels.reviewHintSwitch : labels.reviewHint, { chain: flow.chainName }),
      icon: config.icon,
      primaryAction: { label: t('actionFlow.action.continue'), onClick: onContinue },
    };
  }

  if (flow.stage === 'switch-network') {
    return {
      stepLabel: t('create.flow.step.network'),
      title: t('create.flow.switch.title', { chain: flow.chainName }),
      description:
        flow.actionState === 'awaiting-wallet'
          ? t('create.flow.switch.awaitingWallet')
          : flow.actionState === 'confirming'
            ? t('create.flow.switch.confirming', { chain: flow.chainName })
            : t('create.flow.switch.description', { chain: flow.chainName }),
      hint: t('create.flow.switch.hint'),
      icon: Waypoints,
      primaryAction: buildFlowAction({
        actionState: flow.actionState,
        idleLabel: t('create.flow.action.switchNetwork', { chain: flow.chainName }),
        onClick: onSwitchNetwork,
        t,
      }),
    };
  }

  if (flow.stage === 'execute') {
    return {
      stepLabel: t('actionFlow.step.execute'),
      title: t(labels.executeTitle),
      description:
        flow.actionState === 'awaiting-wallet'
          ? t('actionFlow.execute.awaitingWallet')
          : flow.actionState === 'confirming'
            ? t('actionFlow.execute.confirming', { chain: flow.chainName })
            : t(labels.executeDescription),
      hint: t(labels.executeHint),
      icon: config.icon,
      primaryAction: buildFlowAction({
        actionState: flow.actionState,
        idleLabel: t(labels.executeButton),
        onClick: onExecute,
        t,
      }),
    };
  }

  return {
    stepLabel: t('actionFlow.step.success'),
    title: t(labels.successTitle),
    description: t(labels.successDescription),
    hint: t(labels.successHint),
    icon: Sparkles,
    primaryAction: { label: t('actionFlow.action.done'), onClick: onDone },
  };
}
