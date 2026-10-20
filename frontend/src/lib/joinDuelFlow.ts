import type { FlowCore } from '@/lib/flowSession';

export type JoinDuelFlowStage =
  | 'review'
  | 'switch-network'
  | 'approve'
  | 'join-duel'
  | 'success';

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

export interface JoinDuelFlowSession extends FlowCore<JoinDuelFlowStage> {
  draft: JoinDuelFlowDraft;
}

/** The first step that needs the wallet once the checks pass: the network, an allowance, or the join itself. */
export function joinStageAfterChecks(options: {
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
}): JoinDuelFlowStage {
  if (options.needsNetworkSwitch) {
    return 'switch-network';
  }

  return options.needsApproval ? 'approve' : 'join-duel';
}
