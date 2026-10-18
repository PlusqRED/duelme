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
