import type { SigningModel } from '@/components/sign/signingModel';
import { signItems } from '@/components/sign/signItems';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import type { Translator } from '@/i18n/translate';
import type { SeatSide } from '@/lib/duel';
import type { FlowError } from '@/lib/flowError';
import type { FlowActionState } from '@/lib/flowSession';
import type { FlowPlace } from '@/lib/signingSteps';
import { signPlan } from '@/lib/signPlan';
import { fundingWrite, type FundingCall } from '@/lib/writeRoute';

/** What a create or a join hands its window about the stake, as its dialog's props have it. */
export interface FundingFlowProps {
  open: boolean;
  canClose: boolean;
  draft: { rawAmount: bigint; chainId: number; chainName: string; usdtAddress: `0x${string}`; contractAddress: `0x${string}` };
  stage: 'review' | 'switch-network' | 'approve' | 'join-duel' | 'create-duel' | 'success';
  actionState: FlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  completedSwitchNetwork: boolean;
  completedApproval: boolean;
  errorMessage?: FlowError | null;
  review: FlowReviewGate;
}

interface FundingModelOptions {
  call: FundingCall;
  isRelayEnabled: boolean;
  /** The stake, bare, as the copy shows it. */
  wager: string;
  /** The move in the action's own words. */
  move: string;
  side: SeatSide;
  t: Translator['t'];
}

type FundingModel = Pick<
  SigningModel,
  | 'open'
  | 'canClose'
  | 'route'
  | 'items'
  | 'place'
  | 'actionState'
  | 'error'
  | 'signing'
  | 'showNetwork'
  | 'approved'
  | 'chainId'
  | 'chainName'
  | 'wager'
  | 'stake'
  | 'blockedReason'
  | 'canContinue'
  | 'facts'
>;

/**
 * The part of a create or join window that is about the stake: relayed, a permit then the move;
 * self-paid, an approve while the allowance is short and then the move, each a transaction. The
 * balance gate keeps Continue closed until a fresh read covers the stake.
 */
export function fundingModel(props: FundingFlowProps, { call, isRelayEnabled, wager, move, side, t }: FundingModelOptions): FundingModel {
  const { draft, review } = props;
  const write = fundingWrite(call, isRelayEnabled, draft.contractAddress);
  const plan = signPlan({ route: write.route, funds: true, needsApproval: props.needsApproval || props.completedApproval });
  const place: FlowPlace =
    props.stage === 'join-duel' || props.stage === 'create-duel' ? 'write' : props.stage;

  return {
    open: props.open,
    canClose: props.canClose,
    route: write.route,
    items: signItems({ plan, route: write.route, move, moveGas: call === 'createDuel' ? 'create' : 'join', wager, t }),
    place,
    actionState: props.actionState,
    error: props.errorMessage ?? null,
    signing: review.signing,
    showNetwork: props.needsNetworkSwitch || props.completedSwitchNetwork,
    approved: props.completedApproval,
    chainId: draft.chainId,
    chainName: draft.chainName,
    wager,
    stake: { funding: review.funding, needRaw: draft.rawAmount, side, isJoining: call === 'joinDuel' },
    blockedReason: review.blockedReason ? t(review.blockedReason) : null,
    canContinue: review.canContinue,
    facts: { contract: draft.contractAddress, functionName: write.functionName, token: draft.usdtAddress, allowance: wager },
  };
}
