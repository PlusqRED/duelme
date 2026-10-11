import { erc2771ForwarderAbi } from '@/lib/contracts';
import { bestErrorDetail } from '@/lib/errorDetails';
import {
  refusal,
  toForwardRequestArgs,
  type RelayForwardRequest,
  type RelayRefusal,
} from '@/lib/relayRequest';
import type { RelayerConfig } from '@/lib/relayerConfig';

export type RelaySimulation = { ok: true; executeEstimate: bigint } | RelayRefusal;

/**
 * The forwarder's own check of the signature, the signer's nonce and the deadline. One
 * `eth_call`, cheap enough to repeat under the relayer lock.
 */
export async function verifyForwardRequest(
  config: RelayerConfig,
  request: RelayForwardRequest
): Promise<RelayRefusal | null> {
  const verified = await config.publicClient.readContract({
    address: config.forwarderAddress,
    abi: erc2771ForwarderAbi,
    functionName: 'verify',
    args: [toForwardRequestArgs(request)],
  });

  return verified
    ? null
    : refusal(
        'INVALID_SIGNATURE',
        'The forwarder rejected this request: bad signature, wrong nonce, or expired deadline.',
        400
      );
}

/** Estimates `execute` as the relayer would send it; a failure says why it would not run. */
export async function simulateExecute(
  config: RelayerConfig,
  request: RelayForwardRequest,
  functionName: string
): Promise<RelaySimulation> {
  try {
    const executeEstimate = await config.publicClient.estimateContractGas({
      address: config.forwarderAddress,
      abi: erc2771ForwarderAbi,
      functionName: 'execute',
      args: [toForwardRequestArgs(request)],
      account: config.relayerAddress,
    });
    return { ok: true, executeEstimate };
  } catch (error) {
    const simulation = await describeInnerRevert(config, request, error);
    if (!simulation.reverted) {
      return refusal('RELAYER_UNAVAILABLE', simulation.message, 502);
    }
    console.error(`[relay] ${functionName} would revert for ${request.from}`);
    return refusal('EXECUTION_REVERTED', simulation.message, 400);
  }
}

/**
 * Everything that can refuse a request without the relayer's own nonce: the forwarder's
 * `verify`, then a simulation of `execute`. It runs before the request may queue for the
 * relayer lock, so a request that would revert — which costs its sender nothing to sign —
 * never holds a place a real player is waiting for.
 *
 * The two calls stay in sequence: estimating in parallel with `verify` would buy every
 * badly signed request a simulation it never needed.
 */
export async function admitRelayRequest(
  config: RelayerConfig,
  request: RelayForwardRequest,
  functionName: string
): Promise<RelayRefusal | null> {
  const rejected = await verifyForwardRequest(config, request);
  if (rejected) {
    return rejected;
  }

  const simulation = await simulateExecute(config, request, functionName);
  return simulation.ok ? null : simulation;
}

/**
 * `execute` reverts with a bare `Errors.FailedCall()` — OpenZeppelin does not bubble up the
 * inner revert data — so a failed simulation says nothing useful on its own. Re-simulating
 * the inner call directly as the signer recovers the real reason, and costs an extra RPC
 * round trip only on the failure path.
 *
 * It also separates the two reasons `estimateContractGas` can fail. If the inner call
 * reverts too, the duel action really is unexecutable and the player has to change
 * something. If it succeeds, the estimate failed for a reason that has nothing to do with
 * them — an RPC hiccup, an expired deadline, the forwarder's gas check during the binary
 * search — and telling them their action "would revert" sends them off to fix what isn't
 * broken.
 */
async function describeInnerRevert(
  config: RelayerConfig,
  request: RelayForwardRequest,
  outerError: unknown
): Promise<{ reverted: boolean; message: string }> {
  try {
    await config.publicClient.call({
      account: request.from,
      to: request.to,
      data: request.data,
    });
  } catch (innerError) {
    const reason = bestErrorDetail(innerError);
    return {
      reverted: true,
      message: reason
        ? `The duel action would revert: ${reason}`
        : 'The duel action would revert on-chain.',
    };
  }

  console.error('[relay] gas estimate failed while the duel action itself simulates fine', outerError);
  return { reverted: false, message: 'Could not price this transaction right now.' };
}
