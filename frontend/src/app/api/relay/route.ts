import { erc2771ForwarderAbi } from '@/lib/contracts';
import {
  parseRelayPayload,
  relayGasLimit,
  toForwardRequestArgs,
  type RelayForwardRequest,
  type RelayOutcome,
} from '@/lib/relayRequest';
import type { RelayerConfig } from '@/lib/relayerConfig';
import { relayRequestKey } from '@/lib/relayerDedup';
import {
  answerOnce,
  readRelayPost,
  readSendTerms,
  refuseRelayPayload,
  sendBudgeted,
  sendUnderRelayerLock,
  type BroadcastOutcome,
} from '@/lib/relayerSend';
import { refuseWhileHeld } from '@/lib/relayerSignerHold';
import { admitRelayRequest, simulateExecute, verifyForwardRequest } from '@/lib/relaySimulation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Relays a signed ERC-2771 forward request so the player never needs ETH.
 *
 * Admission is layered, cheapest first. A request that would revert is turned away before
 * it may queue for the relayer lock, so it never holds a place a real player waits for:
 *   1. the per-client rate limit;
 *   2. shape, chain and allowlist, locally;
 *   3. a repeat of a request already being relayed, or relayed a moment ago, gets that
 *      request's answer instead of a second transaction, and a signer whose last relayed
 *      transaction has no receipt yet is asked to wait;
 *   4. the forwarder's own `verify`, then a simulation of `execute`.
 * Only a request that passes all four queues. Under the lock the hold, `verify` and the
 * simulation run once more — another transaction may have landed while it waited — then the
 * daily budget is reserved and the transaction is signed and sent. The receipt is awaited
 * after the lock.
 *
 * No session or token is required. The forwarder recovers the signer from an EIP-712
 * signature, so `request.from` is already authenticated by the signature itself — that is
 * what the per-address budget meters, and nobody can spend another player's allowance.
 */
export async function POST(httpRequest: Request) {
  const post = await readRelayPost(httpRequest);
  if (!post.ok) {
    return post.response;
  }
  const { config, payload } = post;

  const parsed = parseRelayPayload(payload, {
    chainId: config.chainId,
    duelMeAddress: config.duelMeAddress,
  });
  if (!parsed.ok) {
    return refuseRelayPayload(parsed);
  }

  const { request } = parsed.body;
  return answerOnce(relayRequestKey(request), () => relay(config, request, parsed.functionName), 'duel action');
}

async function relay(
  config: RelayerConfig,
  request: RelayForwardRequest,
  functionName: string
): Promise<RelayOutcome> {
  const refused = refuseWhileHeld(request.from) ?? (await admitRelayRequest(config, request, functionName));
  if (refused) {
    return refused;
  }

  return sendUnderRelayerLock(
    config,
    request.from,
    () => broadcast(config, request, functionName),
    'The duel action reverted on-chain — reload and try again.'
  );
}

/**
 * Runs inside the relayer lock, which signs and sends one transaction at a time, once the
 * signer's hold has been checked again there (`sendUnderRelayerLock`).
 */
async function broadcast(
  config: RelayerConfig,
  request: RelayForwardRequest,
  functionName: string
): Promise<BroadcastOutcome> {
  const args = toForwardRequestArgs(request);
  const { walletClient, forwarderAddress } = config;

  // Nothing here depends on anything else here, and every one of them is a round trip the
  // player waits through while the lock is held — so they go out together. Admission
  // already ran `verify` and the simulation, but either can change while the request
  // waits: a transaction sent before it can take the duel it wanted, its deadline can pass,
  // or someone can execute the same signed request elsewhere. Only admitted requests get
  // here, so running both alongside costs junk nothing.
  const [rejected, simulation, { maxFeePerGas, maxPriorityFeePerGas, nonce }] = await Promise.all([
    verifyForwardRequest(config, request),
    simulateExecute(config, request, functionName),
    readSendTerms(config),
  ]);

  if (rejected) {
    return rejected;
  }
  if (!simulation.ok) {
    return simulation;
  }

  // The gas limit is the relayer's own call (relayGasLimit); the fees are the shared policy.
  const gasLimit = relayGasLimit(args.gas, simulation.executeEstimate);

  return sendBudgeted(config, request.from, gasLimit * maxFeePerGas, () =>
    walletClient.writeContract({
      chain: config.chain,
      account: config.account,
      address: forwarderAddress,
      abi: erc2771ForwarderAbi,
      functionName: 'execute',
      args: [args],
      gas: gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
    })
  );
}
