export type GuidedTransactionStepState =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'skipped'
  | 'error';

export type CreateDuelFlowStage =
  | 'review'
  | 'switch-network'
  | 'approve'
  | 'create-duel'
  | 'success';

export type CreateDuelFlowActionState =
  | 'idle'
  | 'awaiting-wallet'
  | 'confirming'
  | 'error';

export interface GuidedTransactionStep {
  id: CreateDuelFlowStage;
  status: GuidedTransactionStepState;
}

export interface CreateDuelFlowDraft {
  rawAmount: bigint;
  chainId: number;
  chainName: string;
  usdtAddress: `0x${string}`;
  contractAddress: `0x${string}`;
  inviteHash: `0x${string}`;
  inviteSecret: `0x${string}` | null;
  isPublic: boolean;
  gameName: string;
  message: string;
}

export type CreateDuelPendingTransaction = 'approve' | 'create-duel' | null;

export interface CreateDuelFlowSession {
  draft: CreateDuelFlowDraft;
  stage: CreateDuelFlowStage;
  actionState: CreateDuelFlowActionState;
  errorMessage: string | null;
  pendingTransaction: CreateDuelPendingTransaction;
}

export function getNextCreateDuelFlowStageFromReview(options: {
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
}): CreateDuelFlowStage {
  if (options.needsNetworkSwitch) {
    return 'switch-network';
  }

  if (options.needsApproval) {
    return 'approve';
  }

  return 'create-duel';
}

export function getCreateDuelFlowStageAfterNetwork(options: {
  needsApproval: boolean;
}): CreateDuelFlowStage {
  return options.needsApproval ? 'approve' : 'create-duel';
}

export function getCreateDuelFlowSteps(options: {
  stage: CreateDuelFlowStage;
  actionState: CreateDuelFlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
}): GuidedTransactionStep[] {
  const switchStatus = getOptionalStepStatus({
    stage: options.stage,
    actionState: options.actionState,
    stepId: 'switch-network',
    isRequired: options.needsNetworkSwitch,
    completedStages: ['approve', 'create-duel', 'success'],
  });

  const approveStatus = getOptionalStepStatus({
    stage: options.stage,
    actionState: options.actionState,
    stepId: 'approve',
    isRequired: options.needsApproval,
    completedStages: ['create-duel', 'success'],
  });

  const createStatus =
    options.stage === 'success'
      ? 'completed'
      : options.stage === 'create-duel'
        ? options.actionState === 'error'
          ? 'error'
          : 'active'
        : 'upcoming';

  return [
    {
      id: 'review',
      status: options.stage === 'review' ? 'active' : 'completed',
    },
    {
      id: 'switch-network',
      status: switchStatus,
    },
    {
      id: 'approve',
      status: approveStatus,
    },
    {
      id: 'create-duel',
      status: createStatus,
    },
    {
      id: 'success',
      status: options.stage === 'success' ? 'active' : 'upcoming',
    },
  ];
}

function getOptionalStepStatus(options: {
  stage: CreateDuelFlowStage;
  actionState: CreateDuelFlowActionState;
  stepId: 'switch-network' | 'approve';
  isRequired: boolean;
  completedStages: CreateDuelFlowStage[];
}): GuidedTransactionStepState {
  if (!options.isRequired) {
    return 'skipped';
  }

  if (options.stage === options.stepId) {
    return options.actionState === 'error' ? 'error' : 'active';
  }

  if (options.completedStages.includes(options.stage)) {
    return 'completed';
  }

  return 'upcoming';
}
