import {
  ListChecks,
  ShieldCheck,
  Sparkles,
  Swords,
  Waypoints,
} from 'lucide-react';
import type { useTranslation } from '@/i18n/useTranslation';
import type { CreateDuelFlowActionState, CreateDuelFlowStage } from '@/lib/createDuelFlow';
import type { GuidedTransactionDialogConfig } from '@/lib/guidedTransaction';

interface GetCreateDuelDialogConfigOptions {
  stage: CreateDuelFlowStage;
  actionState: CreateDuelFlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  formattedAmount: string;
  chainName: string;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onApprove: () => void;
  onCreateDuel: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

export function getCreateDuelDialogConfig(
  options: GetCreateDuelDialogConfigOptions
): GuidedTransactionDialogConfig {
  if (options.stage === 'review') {
    return {
      stepLabel: options.t('create.flow.step.review'),
      title: options.t('create.flow.review.title', { amount: options.formattedAmount }),
      description: options.t('create.flow.review.description'),
      hint: options.t(getReviewHintKey(options), {
        amount: options.formattedAmount,
        chain: options.chainName,
      }),
      icon: ListChecks,
      primaryAction: {
        label: options.t('create.flow.action.continue'),
        onClick: options.onContinue,
      },
    };
  }

  if (options.stage === 'switch-network') {
    return {
      stepLabel: options.t('create.flow.step.network'),
      title: options.t('create.flow.switch.title', { chain: options.chainName }),
      description:
        options.actionState === 'awaiting-wallet'
          ? options.t('create.flow.switch.awaitingWallet')
          : options.actionState === 'confirming'
            ? options.t('create.flow.switch.confirming', { chain: options.chainName })
            : options.t('create.flow.switch.description', { chain: options.chainName }),
      hint: options.t('create.flow.switch.hint'),
      icon: Waypoints,
      primaryAction: buildAction({
        actionState: options.actionState,
        idleLabel: options.t('create.flow.action.switchNetwork', {
          chain: options.chainName,
        }),
        onClick: options.onSwitchNetwork,
        t: options.t,
      }),
    };
  }

  if (options.stage === 'approve') {
    return {
      stepLabel: options.t('create.flow.step.approve'),
      title: options.t('create.flow.approve.title', { amount: options.formattedAmount }),
      description:
        options.actionState === 'awaiting-wallet'
          ? options.t('create.flow.approve.awaitingWallet')
          : options.actionState === 'confirming'
            ? options.t('create.flow.approve.confirming', { chain: options.chainName })
            : options.t('create.flow.approve.description', {
                amount: options.formattedAmount,
              }),
      hint:
        options.actionState === 'awaiting-wallet' ||
        options.actionState === 'confirming'
          ? options.t('create.flow.approve.walletModalHint', {
              amount: options.formattedAmount,
              chain: options.chainName,
            })
          : options.t('create.flow.approve.hint', { chain: options.chainName }),
      icon: ShieldCheck,
      primaryAction: buildAction({
        actionState: options.actionState,
        idleLabel: options.t('create.flow.action.approve', {
          amount: options.formattedAmount,
        }),
        onClick: options.onApprove,
        t: options.t,
      }),
    };
  }

  if (options.stage === 'create-duel') {
    return {
      stepLabel: options.t('create.flow.step.create'),
      title: options.t('create.flow.create.title'),
      description:
        options.actionState === 'awaiting-wallet'
          ? options.t('create.flow.create.awaitingWallet')
          : options.actionState === 'confirming'
            ? options.t('create.flow.create.confirming', { chain: options.chainName })
            : options.t('create.flow.create.description', {
                amount: options.formattedAmount,
              }),
      hint: options.t('create.flow.create.hint'),
      icon: Swords,
      primaryAction: buildAction({
        actionState: options.actionState,
        idleLabel: options.t('create.flow.action.create'),
        onClick: options.onCreateDuel,
        t: options.t,
      }),
    };
  }

  return {
    stepLabel: options.t('create.flow.step.success'),
    title: options.t('create.flow.success.title'),
    description: options.t('create.flow.success.description'),
    hint: options.t('create.flow.success.hint'),
    icon: Sparkles,
    primaryAction: {
      label: options.t('create.flow.success.opening'),
      onClick: options.onCreateDuel,
      disabled: true,
      loading: true,
    },
  };
}

export function getCreateDuelStepLabelKey(stage: CreateDuelFlowStage) {
  switch (stage) {
    case 'review':
      return 'create.flow.step.review';
    case 'switch-network':
      return 'create.flow.step.network';
    case 'approve':
      return 'create.flow.step.approve';
    case 'create-duel':
      return 'create.flow.step.create';
    case 'success':
      return 'create.flow.step.success';
  }
}

function buildAction(options: {
  actionState: CreateDuelFlowActionState;
  idleLabel: string;
  onClick: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return {
    label:
      options.actionState === 'awaiting-wallet'
        ? options.t('status.confirmWallet')
        : options.actionState === 'error'
          ? options.t('create.flow.action.tryAgain')
          : options.idleLabel,
    onClick: options.onClick,
    disabled: options.actionState === 'awaiting-wallet' || options.actionState === 'confirming',
    loading: options.actionState === 'awaiting-wallet' || options.actionState === 'confirming',
  };
}

function getReviewHintKey(options: {
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
}) {
  if (options.needsNetworkSwitch && options.needsApproval) {
    return 'create.flow.review.hint.switchAndApprove';
  }

  if (options.needsNetworkSwitch) {
    return 'create.flow.review.hint.switchOnly';
  }

  if (options.needsApproval) {
    return 'create.flow.review.hint.approveOnly';
  }

  return 'create.flow.review.hint.createOnly';
}
