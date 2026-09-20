import { NextResponse } from 'next/server';
import type { Hex } from 'viem';
import { erc2771ForwarderAbi } from '@/lib/contracts';
import { bestErrorDetail } from '@/lib/errorDetails';
import {
  parseRelayPayload,
  relayGasLimit,
  toForwardRequestArgs,
  type RelayErrorCode,
  type RelayErrorResponse,
  type RelayForwardRequest,
  type RelaySuccessResponse,
} from '@/lib/relayRequest';
import { getRelayerConfig, type RelayerConfig } from '@/lib/relayerConfig';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { getBufferedTestnetFeeParams, getMainnetFeeParams } from '@/lib/testnetGas';
import { releaseDailyBudget, reserveDailyBudget, settleDailyBudget } from '@/lib/relayerBudget';
import { RelayerBusyError, withRelayerLock } from '@/lib/relayerQueue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How long to wait for a receipt before answering without an exact settlement. */
const RECEIPT_TIMEOUT_MS = 30_000;

/**
 * Whether this deployment can relay, and for which chain. The client needs the answer
 * before it builds a duel action: relaying replaces the separate `approve` transaction with
 * an EIP-2612 permit signature, so the guided flow has to know which shape it is running.
 *
 * Deliberately says nothing about the relayer address, its balance or the budgets — only
 * that relaying is on.
 */
export async function GET() {
  const resolved = getRelayerConfig();

  return NextResponse.json(
    resolved.ok
      ? { available: true, chainId: resolved.config.chainId }
      : { available: false, chainId: null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Relays a signed ERC-2771 forward request so the player never needs ETH.
 *
 * Admission is layered, cheapest first: shape and allowlist locally, then the forwarder's
 * own `verify`, then the daily budget, then a simulation. Only after all four does the
 * relayer spend anything.
 *
 * No session or token is required. The forwarder recovers the signer from an EIP-712
 * signature, so `request.from` is already authenticated by the signature itself — that is
 * what the per-address budget meters, and nobody can spend another player's allowance.
 */
export async function POST(httpRequest: Request) {
  const resolved = getRelayerConfig();
  if (!resolved.ok) {
    console.error('[relay] disabled:', resolved.reason);
    return fail('RELAYER_UNAVAILABLE', 'Gasless relaying is not available.', 503);
  }
  const config = resolved.config;

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

  let outcome: BroadcastOutcome;
  try {
    outcome = await withRelayerLock(() => broadcast(config, parsed.body.request, parsed.functionName));
  } catch (error) {
    if (error instanceof RelayerBusyError) {
      return fail('RELAYER_UNAVAILABLE', error.message, 503);
    }
    console.error('[relay] unexpected failure', error);
    return fail('RELAYER_UNAVAILABLE', 'Relaying failed unexpectedly.', 502);
  }

  if (!outcome.sent) {
    return outcome.response;
  }

  // Deliberately outside the lock: the nonce is already consumed by the broadcast above, so
  // the next request can read `pending` and get a fresh one. Waiting for the receipt in here
  // would hold the relayer idle for up to RECEIPT_TIMEOUT_MS per request.
  return await confirm(config, parsed.body.request.from, outcome);
}

type BroadcastOutcome =
  | { sent: false; response: ReturnType<typeof fail> }
  | { sent: true; hash: Hex; worstCaseWei: bigint };

/**
 * Runs inside the single-in-flight lock: every step from here on assumes no other relayed
 * transaction is being signed, which is what makes reading the nonce from the chain safe.
 */
async function broadcast(
  config: RelayerConfig,
  request: RelayForwardRequest,
  functionName: string
): Promise<BroadcastOutcome> {
  const args = toForwardRequestArgs(request);
  const { publicClient, walletClient, forwarderAddress } = config;

  // Nothing here depends on anything else here, and every one of them is a round trip the
  // player waits through while the lock is held — so they go out together.
  //
  // `verify` is re-checked under the lock rather than at parse time: the signer's forwarder
  // nonce can move between requests, and a stale signature must not reach a paid simulation.
  // The nonce read is safe this early because the lock is only acquired after the previous
  // request's eth_sendRawTransaction returned.
  const [verified, feeEstimate, block, nonce] = await Promise.all([
    publicClient.readContract({
      address: forwarderAddress,
      abi: erc2771ForwarderAbi,
      functionName: 'verify',
      args: [args],
    }),
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
    publicClient.getTransactionCount({ address: config.relayerAddress, blockTag: 'pending' }),
  ]);

  if (!verified) {
    return refuse(
      'INVALID_SIGNATURE',
      'The forwarder rejected this request: bad signature, wrong nonce, or expired deadline.',
      400
    );
  }

  // Fees come from the same policy the self-paid path uses: Arbitrum One legitimately reports
  // a zero priority fee, which some serializers reject, and a base-fee spike between estimate
  // and submission is what "max fee per gas less than block base fee" looks like. The gas
  // limit is the relayer's own call (relayGasLimit) — the fees are not.
  const { maxFeePerGas, maxPriorityFeePerGas } =
    config.chainId === SUPPORTED_CHAINS.arbitrumSepolia.id
      ? getBufferedTestnetFeeParams(feeEstimate, block.baseFeePerGas)
      : getMainnetFeeParams(feeEstimate, block.baseFeePerGas);

  let executeEstimate: bigint;
  try {
    executeEstimate = await publicClient.estimateContractGas({
      address: forwarderAddress,
      abi: erc2771ForwarderAbi,
      functionName: 'execute',
      args: [args],
      account: config.relayerAddress,
    });
  } catch (error) {
    const simulation = await describeInnerRevert(config, request, error);
    if (!simulation.reverted) {
      return refuse('RELAYER_UNAVAILABLE', simulation.message, 502);
    }
    console.error(`[relay] ${functionName} would revert for ${request.from}`);
    return refuse('EXECUTION_REVERTED', simulation.message, 400);
  }

  const gasLimit = relayGasLimit(args.gas, executeEstimate);
  const worstCaseWei = gasLimit * maxFeePerGas;

  const budget = reserveDailyBudget(request.from, worstCaseWei, {
    perAddressWei: config.dailyBudgetWei,
    globalWei: config.globalDailyBudgetWei,
  });

  if (!budget.allowed) {
    if (budget.exceeded === 'global') {
      // Not this caller's fault — the relayer itself is out of budget for the day.
      console.error('[relay] relayer-wide daily budget exhausted');
      return refuse(
        'RELAYER_UNAVAILABLE',
        'Gasless relaying is paused for today. It resumes at 00:00 UTC.',
        503
      );
    }

    return refuse(
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
    return refuse('RELAYER_UNAVAILABLE', 'Could not broadcast the transaction.', 502);
  }

  return { sent: true, hash, worstCaseWei };
}

/**
 * Waits for the broadcast transaction and books what it really cost. Runs outside the
 * relayer lock — the nonce is already spent, so the next request is free to go.
 */
async function confirm(
  config: RelayerConfig,
  from: `0x${string}`,
  { hash, worstCaseWei }: { hash: Hex; worstCaseWei: bigint }
) {
  try {
    const receipt = await config.publicClient.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
    // Gas was spent either way, so the reservation settles to the real cost before the
    // status is inspected.
    settleDailyBudget(from, worstCaseWei, receipt.gasUsed * receipt.effectiveGasPrice);

    if (receipt.status === 'reverted') {
      // The simulation passed, so state moved between admission and mining — the duel was
      // joined by someone else, the claim window closed, the permit nonce was used.
      console.error('[relay] forwarded call reverted after a clean simulation', hash);
      return fail('EXECUTION_REVERTED', 'The duel action reverted on-chain — reload and try again.', 409);
    }
  } catch {
    // The transaction is broadcast and may still land, so the worst-case reservation
    // stands rather than handing back an allowance that is possibly being spent.
    console.error('[relay] receipt wait timed out, keeping worst-case reservation', hash);
  }

  return NextResponse.json<RelaySuccessResponse>({ hash }, { headers: { 'Cache-Control': 'no-store' } });
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

function fail(code: RelayErrorCode, error: string, status: number) {
  return NextResponse.json<RelayErrorResponse>(
    { code, error },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

/** `fail`, shaped as the "nothing was broadcast" branch of a BroadcastOutcome. */
function refuse(code: RelayErrorCode, error: string, status: number): BroadcastOutcome {
  return { sent: false, response: fail(code, error, status) };
}
