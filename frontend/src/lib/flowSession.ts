import type { Hex } from 'viem';
import type { FlowError } from '@/lib/flowError';
import type { SigningPhase } from '@/lib/signPlan';

/** What the step on screen is doing: waiting for the player, in the wallet, on the network, or stopped. */
export type FlowActionState = 'idle' | 'awaiting-wallet' | 'confirming' | 'error';

/** Where a step stood when it stopped: still in the wallet, or already on its way through the network. */
export type FailedWhile = 'awaiting-wallet' | 'confirming';

/** The optional steps a flow has been through: a network switch, an approve. */
export interface FlowSteps {
  switchNetwork: boolean;
  approve: boolean;
}

/**
 * Where a signing flow stands, whatever its stages are called: the action, join and create flows
 * each add their own data (the duel, the draft) to this and move it with one reducer.
 */
export interface FlowCore<TStage extends string> {
  stage: TStage;
  actionState: FlowActionState;
  /** Why the step stopped, for the window to word; null while nothing failed. */
  errorMessage: FlowError | null;
  /** The write in flight, by the stage that sent it. */
  pendingTransaction: TStage | null;
  completedSteps: FlowSteps;
  failedWhile: FailedWhile | null;
  /** ETH the wallet paid in network fees during this flow, from its own transactions' receipts. */
  feePaidWei: bigint;
}

/** What a signing window shows of the write under way beyond the flow's stage. */
export interface SigningProgress {
  /** Which signature the wallet is asked for on the relayed path. */
  phase: SigningPhase | null;
  /** The write's transaction, once it is on the network. */
  hash: Hex | undefined;
  failedWhile: FailedWhile | null;
  feePaidWei: bigint;
  /** The duel a create made, once its receipt names it. */
  createdDuelId: number | null;
}

export type FlowEvent<TStage extends string> =
  /** On to a step that waits for the player, or back to one the flow has to take first. */
  | { type: 'moved'; stage: TStage }
  /** The wallet is asked to switch networks, which is a step of its own. */
  | { type: 'switching'; stage: TStage }
  | { type: 'switched'; next: TStage }
  | { type: 'writing'; step: TStage }
  | { type: 'progressed'; actionState: 'awaiting-wallet' | 'confirming' }
  /** `step` ties the failure to the write it ended; without one it ends whatever the step was doing. */
  | { type: 'failed'; error: FlowError; step?: TStage }
  | { type: 'wrote'; step: TStage; next: TStage; feeWei: bigint };

export function startFlow<TStage extends string>(stage: TStage): FlowCore<TStage> {
  return {
    stage,
    actionState: 'idle',
    errorMessage: null,
    pendingTransaction: null,
    completedSteps: { switchNetwork: false, approve: false },
    failedWhile: null,
    feePaidWei: 0n,
  };
}

/**
 * The one way a signing flow moves. An event about a write that is no longer in flight is dropped,
 * and an event that changes nothing returns the flow as it was, so a hook that reports the same
 * progress on every render does not render again.
 */
export function reduceFlow<TFlow extends FlowCore<string>>(flow: TFlow, event: FlowEvent<TFlow['stage']>): TFlow {
  switch (event.type) {
    case 'moved':
      return { ...flow, stage: event.stage, actionState: 'idle', errorMessage: null, failedWhile: null };
    case 'switching':
      return { ...flow, stage: event.stage, actionState: 'awaiting-wallet', errorMessage: null, failedWhile: null };
    case 'switched':
      return {
        ...flow,
        stage: event.next,
        actionState: 'idle',
        errorMessage: null,
        completedSteps: { ...flow.completedSteps, switchNetwork: true },
      };
    case 'writing':
      return {
        ...flow,
        stage: event.step,
        actionState: 'awaiting-wallet',
        errorMessage: null,
        pendingTransaction: event.step,
        failedWhile: null,
      };
    case 'progressed':
      if (flow.pendingTransaction === null || flow.actionState === event.actionState) {
        return flow;
      }
      return { ...flow, actionState: event.actionState };
    case 'failed':
      if (event.step !== undefined && flow.pendingTransaction !== event.step) {
        return flow;
      }
      return {
        ...flow,
        actionState: 'error',
        errorMessage: event.error,
        pendingTransaction: null,
        failedWhile: flow.actionState === 'confirming' ? 'confirming' : 'awaiting-wallet',
      };
    case 'wrote':
      if (flow.pendingTransaction !== event.step) {
        return flow;
      }
      return {
        ...flow,
        stage: event.next,
        actionState: 'idle',
        errorMessage: null,
        pendingTransaction: null,
        completedSteps: { ...flow.completedSteps, approve: flow.completedSteps.approve || event.step === 'approve' },
        feePaidWei: flow.feePaidWei + event.feeWei,
      };
  }
}
