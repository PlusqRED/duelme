import { NextResponse } from 'next/server';
import type { Hex } from 'viem';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import {
  refusal,
  type RelayErrorCode,
  type RelayErrorResponse,
  type RelayOutcome,
  type RelayRefusal,
  type RelaySuccessResponse,
} from '@/lib/relayRequest';
import { getRelayerConfig, type RelayerConfig } from '@/lib/relayerConfig';
import { releaseDailyBudget, reserveDailyBudget, settleDailyBudget } from '@/lib/relayerBudget';
import { RelayerBusyError, withRelayerLock } from '@/lib/relayerQueue';
import { relayClientAddress, takeRelayRateLimit } from '@/lib/relayerRateLimit';
import { holdSigner, releaseSigner, SIGNER_HOLD_MS } from '@/lib/relayerSignerHold';
import { getBufferedTestnetFeeParams, getMainnetFeeParams } from '@/lib/testnetGas';

/**
 * What both relay routes share around their own admission: the first gates a post passes, and
 * once a request is admitted, the lock, the fees, the daily budgets, the send and the wait for its
 * receipt. `/api/relay` forwards duel actions, `/api/relay/transfer` the day's USDT transfer; the
 * relayer, its key and its nonce are one, so both go through the same lock and the same ledgers.
 */

/** How long to wait for a receipt before answering without an exact settlement. */
const RECEIPT_TIMEOUT_MS = 30_000;

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export type RelayPost = { ok: true; config: RelayerConfig; payload: unknown } | { ok: false; response: NextResponse };

/**
 * The cheapest gates, in order: relaying is on, the client is under its rate limit, the body is
 * JSON. A post that fails one costs the relayer no round trip.
 */
export async function readRelayPost(httpRequest: Request): Promise<RelayPost> {
  const resolved = getRelayerConfig();
  if (!resolved.ok) {
    return { ok: false, response: relayFailure('RELAYER_UNAVAILABLE', 'Gasless relaying is not available.', 503) };
  }

  const limit = takeRelayRateLimit(relayClientAddress(httpRequest.headers));
  if (!limit.allowed) {
    return {
      ok: false,
      response: relayFailure('RATE_LIMITED', 'Too many relay requests — try again in a minute.', 429, {
        'Retry-After': String(limit.retryAfterSeconds),
      }),
    };
  }

  try {
    return { ok: true, config: resolved.config, payload: await httpRequest.json() };
  } catch {
    return { ok: false, response: relayFailure('INVALID_REQUEST', 'Request body must be valid JSON.', 400) };
  }
}

export type BroadcastOutcome = RelayRefusal | { ok: true; hash: Hex; worstCaseWei: bigint };

/**
 * Runs `broadcast` under the relayer lock, then waits for its receipt outside it. The nonce is
 * consumed by the broadcast, so the next request can read `pending` and get a fresh one; waiting
 * for the receipt in the lock would hold the relayer idle for up to RECEIPT_TIMEOUT_MS each time.
 */
export async function sendUnderRelayerLock(
  config: RelayerConfig,
  from: `0x${string}`,
  broadcast: () => Promise<BroadcastOutcome>,
  revertedMessage: string
): Promise<RelayOutcome> {
  let sent: BroadcastOutcome;
  try {
    sent = await withRelayerLock(broadcast);
  } catch (error) {
    if (error instanceof RelayerBusyError) {
      return refusal('RELAYER_UNAVAILABLE', error.message, 503);
    }
    throw error;
  }

  if (!sent.ok) {
    return sent;
  }
  return await confirm(config, from, sent, revertedMessage);
}

/**
 * The fees the relayer offers, by the policy the self-paid path uses: Arbitrum One legitimately
 * reports a zero priority fee, which some serializers reject, and a base-fee spike between
 * estimate and submission is what "max fee per gas less than block base fee" looks like.
 */
export function relayerFeeParams(
  config: RelayerConfig,
  feeEstimate: Parameters<typeof getMainnetFeeParams>[0],
  baseFeePerGas: bigint | null | undefined
) {
  return config.chainId === SUPPORTED_CHAINS.arbitrumSepolia.id
    ? getBufferedTestnetFeeParams(feeEstimate, baseFeePerGas)
    : getMainnetFeeParams(feeEstimate, baseFeePerGas);
}

/**
 * Books the transaction's worst case against both daily budgets, sends it, and holds its signer
 * until the receipt. Runs inside the relayer lock: only this lock sends, so the hold checked
 * before it cannot appear between that check and the send.
 */
export async function sendBudgeted(
  config: RelayerConfig,
  from: `0x${string}`,
  worstCaseWei: bigint,
  write: () => Promise<Hex>
): Promise<BroadcastOutcome> {
  const budget = reserveDailyBudget(from, worstCaseWei, {
    perAddressWei: config.dailyBudgetWei,
    globalWei: config.globalDailyBudgetWei,
  });

  if (!budget.allowed) {
    if (budget.exceeded === 'global') {
      // Not this caller's fault — the relayer itself is out of budget for the day.
      console.error('[relay] relayer-wide daily budget exhausted');
      return refusal('RELAYER_UNAVAILABLE', 'Gasless relaying is paused for today. It resumes at 00:00 UTC.', 503);
    }

    return refusal('BUDGET_EXCEEDED', 'Daily gas allowance for this wallet is used up. It resets at 00:00 UTC.', 429);
  }

  let hash: Hex;
  try {
    hash = await write();
  } catch (error) {
    releaseDailyBudget(from, worstCaseWei);
    console.error('[relay] broadcast failed', error);
    return refusal('RELAYER_UNAVAILABLE', 'Could not broadcast the transaction.', 502);
  }

  holdSigner(from, hash);
  return { ok: true, hash, worstCaseWei };
}

/**
 * Waits for the broadcast transaction and books what it really cost. Runs outside the
 * relayer lock — the nonce is already spent, so the next request is free to go.
 */
async function confirm(
  config: RelayerConfig,
  from: `0x${string}`,
  { hash, worstCaseWei }: { hash: Hex; worstCaseWei: bigint },
  revertedMessage: string
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
      // The simulation under the lock passed, so state moved after it: for a duel action the
      // duel was joined by someone else, the claim window closed, the permit nonce was used.
      console.error('[relay] relayed call reverted after a clean simulation', hash);
      return refusal('EXECUTION_REVERTED', revertedMessage, 409);
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

/** A relay's outcome as the route answers it: the hash, or the refusal with its status. */
export function relayAnswer(outcome: RelayOutcome): NextResponse {
  return outcome.ok
    ? NextResponse.json<RelaySuccessResponse>({ hash: outcome.hash }, { headers: noStoreHeaders })
    : relayFailure(outcome.code, outcome.error, outcome.status);
}

export function relayFailure(code: RelayErrorCode, error: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json<RelayErrorResponse>({ code, error }, { status, headers: { ...noStoreHeaders, ...headers } });
}
