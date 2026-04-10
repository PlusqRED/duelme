import type { GuidedFlowActionState, GuidedTransactionStepState } from '@/lib/guidedTransaction';

export function getOptionalStepStatus(options: {
  stage: string;
  actionState: GuidedFlowActionState;
  stepId: string;
  isRequired: boolean;
  completedInFlow: boolean;
  completedStages: string[];
}): GuidedTransactionStepState {
  if (options.stage === options.stepId) {
    return options.actionState === 'error' ? 'error' : 'active';
  }

  if (options.completedInFlow) {
    return 'completed';
  }

  if (!options.isRequired) {
    return 'skipped';
  }

  if (options.completedStages.includes(options.stage)) {
    return 'completed';
  }

  return 'upcoming';
}
