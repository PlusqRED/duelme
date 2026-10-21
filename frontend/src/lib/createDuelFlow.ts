import type { FlowCore } from '@/lib/flowSession';
import type { GameCategory } from '@/lib/game';

export type CreateDuelFlowStage =
  | 'review'
  | 'switch-network'
  | 'approve'
  | 'create-duel'
  | 'success';

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

export interface CreateDuelFlowSession extends FlowCore<CreateDuelFlowStage> {
  draft: CreateDuelFlowDraft;
  /** The duel the create made, once its receipt names it. */
  createdDuelId: number | null;
}

/** The first step that needs the wallet once the checks pass: the network, an allowance, or the create itself. */
export function createStageAfterChecks(options: {
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
}): CreateDuelFlowStage {
  if (options.needsNetworkSwitch) {
    return 'switch-network';
  }

  return options.needsApproval ? 'approve' : 'create-duel';
}
