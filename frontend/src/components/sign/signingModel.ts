import type { FlowFunding } from '@/hooks/useFlowFunding';
import type { FlowError } from '@/lib/flowError';
import type { FlowActionState, SigningProgress } from '@/lib/flowSession';
import type { GasKind } from '@/lib/gasNeeds';
import type { ActionCopy } from '@/lib/signingCopy';
import type { SignStep } from '@/lib/signPlan';
import type { FlowPlace } from '@/lib/signingSteps';
import type { WriteRoute } from '@/lib/writeRoute';

/** The flow's steps that ask the wallet, each started by a handler of its own. */
export type WalletPlace = Exclude<FlowPlace, 'review' | 'success'>;

/** A signature or transaction of the plan, worded. */
export interface SignItem extends SignStep {
  text: string;
  sub: string;
  /** Which row of the gas table a transaction the wallet pays for is. */
  gas: GasKind;
  /** How many of that row it does at once (a Take over several duels); one when left out. */
  gasTimes?: number;
}

/** The stake a create or join puts in, with the top-up window it opens when the wallet is short. */
export interface SigningFunding {
  funding: FlowFunding;
  needRaw: bigint;
  /** Joining: topping up holds no seat, which the top-up window says. */
  isJoining: boolean;
}

/** What the technical details under Check list: who the call goes to and what it may take. */
export interface SigningFacts {
  contract: `0x${string}`;
  functionName: string;
  token?: `0x${string}`;
  /** The stake a permit or approve allows, bare. */
  allowance?: string;
}

/**
 * Everything a signing window shows, worded by the flow that opens it: the action, join and create
 * windows each turn their own props into this, and the window takes it from there.
 */
export interface SigningModel {
  open: boolean;
  /** The flow's own word on closing; the window adds that nothing is under way. */
  canClose: boolean;
  copy: ActionCopy;
  title: string;
  sub: string;
  /** What the move does, under the head. */
  caption: string;
  /** The main button on Check. */
  button: string;
  doneTitle: string;
  doneText: string;
  /** The way on from Done. */
  doneButton: string;
  /** The way out from Check and from an error. */
  backLabel: string;
  /** Said when the network takes long to decide, with the way out it offers. */
  slowText: string;
  /** The wait was left once already: its way out shows at once, without another long wait. */
  wasLeft?: boolean;
  route: WriteRoute;
  items: SignItem[];
  place: FlowPlace;
  actionState: FlowActionState;
  error: FlowError | null;
  signing: SigningProgress;
  /** The wallet was on another network when the flow began. */
  showNetwork: boolean;
  /** An approve already went through in this flow. */
  approved: boolean;
  chainId: number;
  chainName: string;
  /**
   * The duel the window signs for, which the analytics name it by: a create's once its receipt
   * names it, `pending` until then; null for a Take over several, which gives `duelCount` instead.
   */
  duelId: number | 'pending' | null;
  duelCount?: number;
  /** The stake, bare, for the words about an approve that stays. */
  wager?: string;
  stake?: SigningFunding;
  /** Continue is closed for a reason other than money: the duel no longer takes this player. */
  blockedReason: string | null;
  canContinue: boolean;
  facts: SigningFacts;
  onContinue: () => void;
  run: Record<WalletPlace, () => void>;
  onClose: () => void;
  onDone: () => void;
}
