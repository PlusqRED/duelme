import { RELAYABLE_DUEL_FUNCTIONS } from '@/lib/relayRequest';

/** Who sends a duel write: DuelMe's relayer, paying the fee, or the player's wallet, paying in ETH. */
export type WriteRoute = 'relay' | 'self';

/**
 * Who sends a write: the relayer, when relaying is on and the call is one of DuelMe's it accepts,
 * and the wallet otherwise — an approve, for instance, is a token call and stays self-paid. The
 * one rule both the sending (`useDuelActions`) and the plan a signing window shows (`signPlan`)
 * follow, so the window never promises a route the write does not take.
 */
export function resolveWriteRoute(write: {
  isRelayEnabled: boolean;
  target: string;
  contractAddress: string;
  functionName: string;
}): WriteRoute {
  const isDuelCall = write.target.toLowerCase() === write.contractAddress.toLowerCase();
  return write.isRelayEnabled && isDuelCall && RELAYABLE_DUEL_FUNCTIONS.has(write.functionName) ? 'relay' : 'self';
}

/** The two calls that put a stake into a duel. */
export type FundingCall = 'createDuel' | 'joinDuel';

/**
 * The call that funds a duel and who sends it. Relaying is the only reason to sign a permit: it
 * costs the player an extra signature, which pays for itself only when it saves a transaction they
 * would otherwise fund, so a relayed write takes the `*WithPermit` variant and a self-paid one the
 * plain call after an approve.
 */
export function fundingWrite(call: FundingCall, isRelayEnabled: boolean, contractAddress: string) {
  const functionName = isRelayEnabled ? (`${call}WithPermit` as const) : call;
  const route = resolveWriteRoute({ isRelayEnabled, target: contractAddress, contractAddress, functionName });
  return { functionName, route };
}

/**
 * Whether the signing flow still has to send a separate `approve` before the duel call.
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
