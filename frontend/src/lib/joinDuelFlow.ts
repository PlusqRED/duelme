import type {
  GuidedFlowActionState,
  GuidedFlowCompletedSteps,
  GuidedFlowStep,
} from '@/lib/guidedTransaction';
import { getOptionalStepStatus } from '@/lib/guidedFlowSteps';

export type JoinDuelFlowStage =
  | 'review'
  | 'switch-network'
  | 'approve'
  | 'join-duel'
  | 'success';

export type JoinDuelFlowActionState = GuidedFlowActionState;

export type JoinDuelFlowStep = GuidedFlowStep<JoinDuelFlowStage>;

export type JoinDuelPendingTransaction = 'approve' | 'join-duel' | null;

export interface JoinDuelFlowDraft {
  duelId: bigint;
  rawAmount: bigint;
  chainId: number;
  chainName: string;
  usdtAddress: `0x${string}`;
  contractAddress: `0x${string}`;
  inviteSecret: `0x${string}`;
  creatorAddress: string;
}

export type JoinDuelFlowCompletedSteps = GuidedFlowCompletedSteps;

export interface JoinDuelFlowSession {
  draft: JoinDuelFlowDraft;
  completedSteps: JoinDuelFlowCompletedSteps;
  stage: JoinDuelFlowStage;
  actionState: JoinDuelFlowActionState;
  errorMessage: string | null;
  pendingTransaction: JoinDuelPendingTransaction;
}

export function getNextJoinDuelFlowStageFromReview(options: {
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
}): JoinDuelFlowStage {
  if (options.needsNetworkSwitch) {
    return 'switch-network';
  }

  if (options.needsApproval) {
    return 'approve';
  }

  return 'join-duel';
}

export function getJoinDuelFlowStageAfterNetwork(options: {
  needsApproval: boolean;
}): JoinDuelFlowStage {
  return options.needsApproval ? 'approve' : 'join-duel';
}

export function getJoinDuelFlowSteps(options: {
  stage: JoinDuelFlowStage;
  actionState: JoinDuelFlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  completedSwitchNetwork: boolean;
  completedApproval: boolean;
}): JoinDuelFlowStep[] {
  const switchStatus = getOptionalStepStatus({
    stage: options.stage,
    actionState: options.actionState,
    stepId: 'switch-network',
    isRequired: options.needsNetworkSwitch,
    completedInFlow: options.completedSwitchNetwork,
    completedStages: ['approve', 'join-duel', 'success'],
  });

  const approveStatus = getOptionalStepStatus({
    stage: options.stage,
    actionState: options.actionState,
    stepId: 'approve',
    isRequired: options.needsApproval,
    completedInFlow: options.completedApproval,
    completedStages: ['join-duel', 'success'],
  });

  const joinStatus =
    options.stage === 'success'
      ? 'completed'
      : options.stage === 'join-duel'
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
      id: 'join-duel',
      status: joinStatus,
    },
    {
      id: 'success',
      status: options.stage === 'success' ? 'active' : 'upcoming',
    },
  ];
}
