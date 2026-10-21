import { emitBalanceRefresh } from '@/lib/balanceRefresh';
import type { ActionFlowConfig, ActionFlowType } from '@/lib/actionFlow';

type Execute = ActionFlowConfig['execute'];

/** A one-write action; one that pays money out also tells the wallet's balances to read again. */
function action(type: ActionFlowType, execute: Execute, paysOut = false): ActionFlowConfig {
  return paysOut ? { type, execute, onSuccess: emitBalanceRefresh } : { type, execute };
}

export function claimVictoryConfig(execute: Execute): ActionFlowConfig {
  return action('claimVictory', execute);
}

export function admitDefeatConfig(execute: Execute): ActionFlowConfig {
  return action('admitDefeat', execute);
}

export function confirmResultConfig(execute: Execute): ActionFlowConfig {
  return action('confirmResult', execute);
}

export function disputeResultConfig(execute: Execute): ActionFlowConfig {
  return action('disputeResult', execute);
}

export function requestMutualCancellationConfig(execute: Execute): ActionFlowConfig {
  return action('requestMutualCancellation', execute);
}

export function acceptMutualCancellationConfig(execute: Execute): ActionFlowConfig {
  return action('acceptMutualCancellation', execute);
}

export function declineMutualCancellationConfig(execute: Execute): ActionFlowConfig {
  return action('declineMutualCancellation', execute);
}

export function withdrawMutualCancellationConfig(execute: Execute): ActionFlowConfig {
  return action('withdrawMutualCancellation', execute);
}

export function declineDuelConfig(execute: Execute): ActionFlowConfig {
  return action('declineDuel', execute);
}

export function cancelDuelConfig(execute: Execute): ActionFlowConfig {
  return action('cancelDuel', execute);
}

/** `isWinnings`: the duel was won, so the payout is the pot; otherwise it is a stake coming back. */
export function claimPayoutConfig(execute: Execute, isWinnings: boolean): ActionFlowConfig {
  return { ...action('claimPayout', execute, true), isWinnings };
}

export function refundAndClaimConfig(execute: Execute): ActionFlowConfig {
  return action('refundAndClaim', execute, true);
}

export function refundAndClaimAllConfig(
  execute: Execute,
  totalDisplay: string,
  duelCount: number,
  closesTimedOut: boolean
): ActionFlowConfig {
  return { ...action('refundAndClaimAll', execute, true), batch: { count: duelCount, totalDisplay, closesTimedOut } };
}
