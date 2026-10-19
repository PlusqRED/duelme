import { NextResponse } from 'next/server';
import type { Hex } from 'viem';
import { erc2771ForwarderAbi } from '@/lib/contracts';
import {
  parseRelayPayload,
  refusal,
  relayGasLimit,
  toForwardRequestArgs,
  type RelayErrorCode,
  type RelayErrorResponse,
  type RelayForwardRequest,
  type RelayOutcome,
  type RelayRefusal,
  type RelaySuccessResponse,
} from '@/lib/relayRequest';
import { getRelayerConfig, type RelayerConfig } from '@/lib/relayerConfig';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { getBufferedTestnetFeeParams, getMainnetFeeParams } from '@/lib/testnetGas';
import { releaseDailyBudget, reserveDailyBudget, settleDailyBudget } from '@/lib/relayerBudget';
import { RelayerBusyError, withRelayerLock } from '@/lib/relayerQueue';
import { relayClientAddress, takeRelayRateLimit } from '@/lib/relayerRateLimit';
import { relayOnce, relayRequestKey } from '@/lib/relayerDedup';
import { holdSigner, refuseWhileHeld, releaseSigner, SIGNER_HOLD_MS } from '@/lib/relayerSignerHold';
import { admitRelayRequest, simulateExecute, verifyForwardRequest } from '@/lib/relaySimulation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How long to wait for a receipt before answering without an exact settlement. */
const RECEIPT_TIMEOUT_MS = 30_000;

const noStoreHeaders = { 'Cache-Control': 'no-store' };

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
  const resolved = getRelayerConfig();
  if (!resolved.ok) {
    return fail('RELAYER_UNAVAILABLE', 'Gasless relaying is not available.', 503);
  }
  const config = resolved.config;

  const limit = takeRelayRateLimit(relayClientAddress(httpRequest.headers));
  if (!limit.allowed) {
    return fail('RATE_LIMITED', 'Too many relay requests — try again in a minute.', 429, {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  let payload: unknown;
  try {
    payload = await httpRequest.json();
  } catch {
    return fail('INVALID_REQUEST', 'Request body must be valid JSON.', 400);
  }

  const parsed = parseRelayPayload(payload, {
    chainId: config.chainId,
    duelMeAddress: config.duelMeAddress,
  });
  if (!parsed.ok) {
    return fail(parsed.code, parsed.error, parsed.code === 'NOT_RELAYABLE' ? 403 : 400);
  }

  const { request } = parsed.body;
  let outcome: RelayOutcome;
  try {
    outcome = await relayOnce(relayRequestKey(request), () => relay(config, request, parsed.functionName));
  } catch (error) {
    console.error('[relay] unexpected failure', error);
    return fail('RELAYER_UNAVAILABLE', 'Relaying failed unexpectedly.', 502);
  }

  return outcome.ok
    ? NextResponse.json<RelaySuccessResponse>({ hash: outcome.hash }, { headers: noStoreHeaders })
    : fail(outcome.code, outcome.error, outcome.status);
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

  let sent: BroadcastOutcome;
  try {
    sent = await withRelayerLock(() => broadcast(config, request, functionName));
  } catch (error) {
    if (error instanceof RelayerBusyError) {
      return refusal('RELAYER_UNAVAILABLE', error.message, 503);
    }
    throw error;
  }

  if (!sent.ok) {
    return sent;
  }

  // Deliberately outside the lock: the nonce is already consumed by the broadcast above, so
  // the next request can read `pending` and get a fresh one. Waiting for the receipt in here
  // would hold the relayer idle for up to RECEIPT_TIMEOUT_MS per request.
  return await confirm(config, request.from, sent);
}

type BroadcastOutcome = RelayRefusal | { ok: true; hash: Hex; worstCaseWei: bigint };

/**
 * Runs inside the relayer lock, which signs and sends one transaction at a time: nothing
 * else is reading the relayer's nonce while this does, and the lock is only handed on after
 * the previous request's eth_sendRawTransaction returned, so `pending` already counts it.
 */
async function broadcast(
  config: RelayerConfig,
  request: RelayForwardRequest,
  functionName: string
): Promise<BroadcastOutcome> {
  // Checked again here, where it cannot race: only this lock sends, so no hold can appear
  // between this check and the send below.
  const held = refuseWhileHeld(request.from);
  if (held) {
    return held;
  }

  const args = toForwardRequestArgs(request);
  const { publicClient, walletClient, forwarderAddress } = config;

  // Nothing here depends on anything else here, and every one of them is a round trip the
  // player waits through while the lock is held — so they go out together. Admission
  // already ran `verify` and the simulation, but either can change while the request
  // waits: a transaction sent before it can take the duel it wanted, its deadline can pass,
  // or someone can execute the same signed request elsewhere. Only admitted requests get
  // here, so running both alongside costs junk nothing.
  const [rejected, simulation, feeEstimate, block, nonce] = await Promise.all([
    verifyForwardRequest(config, request),
    simulateExecute(config, request, functionName),
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
    publicClient.getTransactionCount({ address: config.relayerAddress, blockTag: 'pending' }),
  ]);

  if (rejected) {
    return rejected;
  }
  if (!simulation.ok) {
    return simulation;
  }

  // Fees come from the same policy the self-paid path uses: Arbitrum One legitimately reports
  // a zero priority fee, which some serializers reject, and a base-fee spike between estimate
  // and submission is what "max fee per gas less than block base fee" looks like. The gas
  // limit is the relayer's own call (relayGasLimit) — the fees are not.
  const { maxFeePerGas, maxPriorityFeePerGas } =
    config.chainId === SUPPORTED_CHAINS.arbitrumSepolia.id
      ? getBufferedTestnetFeeParams(feeEstimate, block.baseFeePerGas)
      : getMainnetFeeParams(feeEstimate, block.baseFeePerGas);

  const gasLimit = relayGasLimit(args.gas, simulation.executeEstimate);
  const worstCaseWei = gasLimit * maxFeePerGas;

  const budget = reserveDailyBudget(request.from, worstCaseWei, {
    perAddressWei: config.dailyBudgetWei,
    globalWei: config.globalDailyBudgetWei,
  });

  if (!budget.allowed) {
    if (budget.exceeded === 'global') {
      // Not this caller's fault — the relayer itself is out of budget for the day.
      console.error('[relay] relayer-wide daily budget exhausted');
      return refusal(
        'RELAYER_UNAVAILABLE',
        'Gasless relaying is paused for today. It resumes at 00:00 UTC.',
        503
      );
    }

    return refusal(
      'BUDGET_EXCEEDED',
      'Daily gas allowance for this wallet is used up. It resets at 00:00 UTC.',
      429
    );
  }

  let hash: Hex;
  try {
    hash = await walletClient.writeContract({
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
    });
  } catch (error) {
    releaseDailyBudget(request.from, worstCaseWei);
    console.error('[relay] broadcast failed', error);
    return refusal('RELAYER_UNAVAILABLE', 'Could not broadcast the transaction.', 502);
  }

  holdSigner(request.from, hash);
  return { ok: true, hash, worstCaseWei };
}

/**
 * Waits for the broadcast transaction and books what it really cost. Runs outside the
 * relayer lock — the nonce is already spent, so the next request is free to go.
 */
async function confirm(
  config: RelayerConfig,
  from: `0x${string}`,
  { hash, worstCaseWei }: { hash: Hex; worstCaseWei: bigint }
): Promise<RelayOutcome> {
  try {
    const receipt = await config.publicClient.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
    releaseSigner(from, hash);
    // Gas was spent either way, so the reservation settles to the real cost before the
    // status is inspected.
    settleDailyBudget(from, worstCaseWei, receipt.gasUsed * receipt.effectiveGasPrice);

    if (receipt.status === 'reverted') {
      // The simulation under the lock passed, so state moved after it — the duel was joined
      // by someone else, the claim window closed, the permit nonce was used.
      console.error('[relay] forwarded call reverted after a clean simulation', hash);
      return refusal('EXECUTION_REVERTED', 'The duel action reverted on-chain — reload and try again.', 409);
    }
  } catch {
    // The transaction is broadcast and may still land, so the worst-case reservation
    // stands rather than handing back an allowance that is possibly being spent, and the
    // signer stays held until a receipt does turn up (or the hold expires). A late receipt
    // books the real cost, as the one awaited above would have.
    console.error('[relay] receipt wait timed out, keeping worst-case reservation', hash);
    void config.publicClient.waitForTransactionReceipt({ hash, timeout: SIGNER_HOLD_MS }).then(
      (receipt) => {
        releaseSigner(from, hash);
        settleDailyBudget(from, worstCaseWei, receipt.gasUsed * receipt.effectiveGasPrice);
      },
      (error: unknown) => console.error('[relay] no receipt before the signer hold ran out', hash, error)
    );
  }

  return { ok: true, hash };
}

function fail(code: RelayErrorCode, error: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json<RelayErrorResponse>(
    { code, error },
    { status, headers: { ...noStoreHeaders, ...headers } }
  );
}
