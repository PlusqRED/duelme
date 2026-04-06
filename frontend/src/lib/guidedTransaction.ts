import type { LucideIcon } from 'lucide-react';
import type { GuidedTransactionStepState } from '@/lib/createDuelFlow';

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
