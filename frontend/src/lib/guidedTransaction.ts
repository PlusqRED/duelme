import type { LucideIcon } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';
import type { useTranslation } from '@/i18n/useTranslation';

export type GuidedTransactionStepState =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'skipped'
  | 'error';

export type GuidedFlowActionState =
  | 'idle'
  | 'awaiting-wallet'
  | 'confirming'
  | 'error';

export interface GuidedFlowCompletedSteps {
  switchNetwork: boolean;
  approve: boolean;
}

export interface GuidedFlowStep<TStage extends string> {
  id: TStage;
  status: GuidedTransactionStepState;
}

export type GuidedTransactionActionVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'link';

export interface GuidedTransactionStepView {
  id: string;
  label: string;
  status: GuidedTransactionStepState;
}

export interface GuidedTransactionSummaryItem {
  label: string;
  value: string;
  emphasize?: boolean;
}

export interface GuidedTransactionDetailItem {
  label: string;
  value: string;
  monospace?: boolean;
}

export interface GuidedTransactionAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: GuidedTransactionActionVariant;
}

export interface GuidedTransactionDialogConfig {
  stepLabel: string;
  title: string;
  description: string;
  hint?: string;
  icon: LucideIcon;
  primaryAction?: GuidedTransactionAction;
}

export function buildFlowAction(options: {
  actionState: GuidedFlowActionState;
  idleLabel: string;
  onClick: () => void;
  t: ReturnType<typeof useTranslation>['t'];
  retryKey?: TranslationKey;
}): GuidedTransactionAction {
  return {
    label:
      options.actionState === 'awaiting-wallet'
        ? options.t('status.confirmWallet')
        : options.actionState === 'error'
          ? options.t(options.retryKey ?? 'create.flow.action.tryAgain')
          : options.idleLabel,
    onClick: options.onClick,
    disabled: options.actionState === 'awaiting-wallet' || options.actionState === 'confirming',
    loading: options.actionState === 'awaiting-wallet' || options.actionState === 'confirming',
  };
}
