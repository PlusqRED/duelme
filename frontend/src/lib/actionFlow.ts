import type { useTranslation } from '@/i18n/useTranslation';
import type { FlowCore, SigningProgress } from '@/lib/flowSession';

export type ActionFlowStage = 'review' | 'switch-network' | 'execute' | 'success';

/** Every duel action that signs one write in the signing window, by the contract call it makes. */
export type ActionFlowType =
  | 'claimVictory'
  | 'admitDefeat'
  | 'confirmResult'
  | 'disputeResult'
  | 'requestMutualCancellation'
  | 'acceptMutualCancellation'
  | 'declineMutualCancellation'
  | 'withdrawMutualCancellation'
  | 'declineDuel'
  | 'cancelDuel'
  | 'claimPayout'
  | 'refundAndClaim'
  | 'refundAndClaimAll';

/** The contract function each action calls, which decides who sends it (`resolveWriteRoute`). */
export const ACTION_FUNCTIONS: Record<ActionFlowType, string> = {
  claimVictory: 'claimVictory',
  admitDefeat: 'admitDefeat',
  confirmResult: 'confirmResult',
  disputeResult: 'disputeResult',
  requestMutualCancellation: 'requestMutualCancellation',
  acceptMutualCancellation: 'acceptMutualCancellation',
  declineMutualCancellation: 'declineMutualCancellation',
  withdrawMutualCancellation: 'withdrawMutualCancellationRequest',
  declineDuel: 'declineDuel',
  cancelDuel: 'cancelDuel',
  claimPayout: 'claimPayout',
  refundAndClaim: 'refundAndClaimPayouts',
  refundAndClaimAll: 'refundAndClaimPayouts',
};

/** Where an action's flow stands, and the duel it acts on. */
export interface ActionFlowState extends FlowCore<ActionFlowStage> {
  actionType: ActionFlowType;
  duelId: bigint;
  chainId: number;
  chainName: string;
}

/** The flow as the signing window reads it: where it stands, and the write under way. */
export interface ActionFlowSession extends ActionFlowState {
  signing: SigningProgress;
}

/** What the window says about the duel, filled in by the page that opens it; amounts carry their unit. */
export interface ActionFlowSummaryContext {
  duelId: number;
  formattedWager: string;
  formattedPot: string;
  chainName: string;
  opponentDisplay: string;
  claimedWinnerDisplay: string;
  claimableDisplay: string;
  t: ReturnType<typeof useTranslation>['t'];
}

export interface ActionFlowConfig {
  type: ActionFlowType;
  execute: () => Promise<void> | void;
  onSuccess?: () => void;
  /** An action over several duels at once: how many, what they pay out together, and whether a timed-out one is among them. */
  batch?: { count: number; totalDisplay: string; closesTimedOut: boolean };
}
