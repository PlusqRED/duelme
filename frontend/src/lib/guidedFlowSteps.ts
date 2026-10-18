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

/**
 * How a create or join funds its stake. The relayed path carries an EIP-2612 permit inside the
 * duel call, so there is no allowance to top up and no approve step to show; the self-paid path
 * funds it from an allowance. While the relay probe is in flight it is neither: the flow reads no
 * allowance, plans no approve step and keeps Continue closed.
 */
export type FundingRoute = 'permit' | 'allowance' | 'unknown';

export function getFundingRoute(relay: { isRelayResolved: boolean; isRelayEnabled: boolean }): FundingRoute {
  if (!relay.isRelayResolved) {
    return 'unknown';
  }

  return relay.isRelayEnabled ? 'permit' : 'allowance';
}

/**
 * Whether the guided flow still has to send a separate `approve` before the duel call.
 *
 * Shared by the create and join flows because the rule is one rule: on the relayed path the
 * wager is authorised by an EIP-2612 signature carried inside the duel call itself, so there
 * is no allowance to top up and the allowance must not be read either — a stale or zero
 * reading would otherwise bounce a gasless flow into a transaction the player cannot pay for.
 */
export async function resolveNeedsApproval(options: {
  fundsViaPermit: boolean;
  readLatestAllowance: () => Promise<bigint | undefined>;
  rawAmount: bigint;
}): Promise<boolean> {
  if (options.fundsViaPermit) {
    return false;
  }

  const latestAllowance = await options.readLatestAllowance();

  return latestAllowance === undefined || latestAllowance < options.rawAmount;
}
