import type {
  GuidedFlowActionState,
  GuidedFlowCompletedSteps,
  GuidedFlowStep,
} from '@/lib/guidedTransaction';
import type { GameCategory } from '@/lib/game';
import { getOptionalStepStatus } from '@/lib/guidedFlowSteps';

export type CreateDuelFlowStage =
  | 'review'
  | 'switch-network'
  | 'approve'
  | 'create-duel'
  | 'success';

export type CreateDuelFlowActionState = GuidedFlowActionState;

export type GuidedTransactionStep = GuidedFlowStep<CreateDuelFlowStage>;

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
  /** The game's category, so a game new to the catalog is added under it when the duel's game is saved. */
  gameCategory: GameCategory | null;
  message: string;
}

export type CreateDuelFlowCompletedSteps = GuidedFlowCompletedSteps;

export type CreateDuelPendingTransaction = 'approve' | 'create-duel' | null;

export interface CreateDuelFlowSession {
  draft: CreateDuelFlowDraft;
  completedSteps: CreateDuelFlowCompletedSteps;
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
  completedSwitchNetwork: boolean;
  completedApproval: boolean;
}): GuidedTransactionStep[] {
  const switchStatus = getOptionalStepStatus({
    stage: options.stage,
    actionState: options.actionState,
    stepId: 'switch-network',
    isRequired: options.needsNetworkSwitch,
    completedInFlow: options.completedSwitchNetwork,
    completedStages: ['approve', 'create-duel', 'success'],
  });

  const approveStatus = getOptionalStepStatus({
    stage: options.stage,
    actionState: options.actionState,
    stepId: 'approve',
    isRequired: options.needsApproval,
    completedInFlow: options.completedApproval,
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
