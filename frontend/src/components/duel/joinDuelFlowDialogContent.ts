import {
  ListChecks,
  ShieldCheck,
  Sparkles,
  Swords,
  Waypoints,
} from 'lucide-react';
import type { useTranslation } from '@/i18n/useTranslation';
import type { JoinDuelFlowActionState, JoinDuelFlowStage } from '@/lib/joinDuelFlow';
import { buildFlowAction, type GuidedTransactionDialogConfig } from '@/lib/guidedTransaction';

interface GetJoinDuelDialogConfigOptions {
  stage: JoinDuelFlowStage;
  actionState: JoinDuelFlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  formattedAmount: string;
  chainName: string;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onApprove: () => void;
  onJoinDuel: () => void;
  onDone: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

export function getJoinDuelDialogConfig(
  options: GetJoinDuelDialogConfigOptions
): GuidedTransactionDialogConfig {
  if (options.stage === 'review') {
    return {
      stepLabel: options.t('join.flow.step.review'),
      title: options.t('join.flow.review.title', { amount: options.formattedAmount }),
      description: options.t('join.flow.review.description'),
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
      primaryAction: buildFlowAction({
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
          ? options.t('create.flow.approve.awaitingWallet', {
              amount: options.formattedAmount,
            })
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
      primaryAction: buildFlowAction({
        actionState: options.actionState,
        idleLabel: options.t('create.flow.action.approve', {
          amount: options.formattedAmount,
        }),
        onClick: options.onApprove,
        t: options.t,
      }),
    };
  }

  if (options.stage === 'join-duel') {
    return {
      stepLabel: options.t('join.flow.step.join'),
      title: options.t('join.flow.join.title'),
      description:
        options.actionState === 'awaiting-wallet'
          ? options.t('join.flow.join.awaitingWallet')
          : options.actionState === 'confirming'
            ? options.t('join.flow.join.confirming', { chain: options.chainName })
            : options.t('join.flow.join.description', {
                amount: options.formattedAmount,
              }),
      hint: options.t('join.flow.join.hint'),
      icon: Swords,
      primaryAction: buildFlowAction({
        actionState: options.actionState,
        idleLabel: options.t('join.flow.action.join', { amount: options.formattedAmount }),
        onClick: options.onJoinDuel,
        t: options.t,
      }),
    };
  }

  return {
    stepLabel: options.t('join.flow.step.success'),
    title: options.t('join.flow.success.title'),
    description: options.t('join.flow.success.description'),
    hint: options.t('join.flow.success.hint'),
    icon: Sparkles,
    primaryAction: {
      label: options.t('join.flow.success.done'),
      onClick: options.onDone,
    },
  };
}

export function getJoinDuelStepLabelKey(stage: JoinDuelFlowStage) {
  switch (stage) {
    case 'review':
      return 'join.flow.step.review';
    case 'switch-network':
      return 'create.flow.step.network';
    case 'approve':
      return 'create.flow.step.approve';
    case 'join-duel':
      return 'join.flow.step.join';
    case 'success':
      return 'join.flow.step.success';
  }
}

function getReviewHintKey(options: {
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
}) {
  if (options.needsNetworkSwitch && options.needsApproval) {
    return 'join.flow.review.hint.switchAndApprove';
  }

  if (options.needsNetworkSwitch) {
    return 'join.flow.review.hint.switchOnly';
  }

  if (options.needsApproval) {
    return 'join.flow.review.hint.approveOnly';
  }

  return 'join.flow.review.hint.joinOnly';
}
