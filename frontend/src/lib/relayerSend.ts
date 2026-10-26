import { NextResponse } from 'next/server';
import type { Hex } from 'viem';
import {
  refusal,
  type RelayErrorCode,
  type RelayErrorResponse,
  type RelayOutcome,
  type RelayPayloadFailure,
  type RelayRefusal,
  type RelaySuccessResponse,
} from '@/lib/relayRequest';
import { getRelayerConfig, type RelayerConfig } from '@/lib/relayerConfig';
import { releaseDailyBudget, reserveDailyBudget, settleDailyBudget } from '@/lib/relayerBudget';
import { relayOnce } from '@/lib/relayerDedup';
import { RelayerBusyError, withRelayerLock } from '@/lib/relayerQueue';
import { relayClientAddress, takeRelayRateLimit } from '@/lib/relayerRateLimit';
import { holdSigner, refuseWhileHeld, releaseSigner, SIGNER_HOLD_MS } from '@/lib/relayerSignerHold';
import { feeParamsFor } from '@/lib/testnetGas';

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

/** A body that failed its parse: a call this relayer will not make is forbidden, anything else malformed. */
export function refuseRelayPayload({ code, error }: RelayPayloadFailure): NextResponse {
  return relayFailure(code, error, code === 'NOT_RELAYABLE' ? 403 : 400);
}

/**
 * Relays a parsed request once, however often it is posted (`relayOnce`), and answers with the
 * outcome. A throw nothing expected is the relayer's failure, logged under `label`.
 */
export async function answerOnce(key: Hex, relay: () => Promise<RelayOutcome>, label: string): Promise<NextResponse> {
  try {
    return relayAnswer(await relayOnce(key, relay));
  } catch (error) {
    console.error(`[relay] unexpected ${label} failure`, error);
    return relayFailure('RELAYER_UNAVAILABLE', 'Relaying failed unexpectedly.', 502);
  }
}

export type BroadcastOutcome = RelayRefusal | { ok: true; hash: Hex; worstCaseWei: bigint };

/**
 * Runs `broadcast` under the relayer lock, then waits for its receipt outside it. The nonce is
 * consumed by the broadcast, so the next request can read `pending` and get a fresh one; waiting
 * for the receipt in the lock would hold the relayer idle for up to RECEIPT_TIMEOUT_MS each time.
 *
 * The signer's hold is checked again first, where it cannot race: only this lock sends, so no
 * hold can appear between that check and the send.
 */
export async function sendUnderRelayerLock(
  config: RelayerConfig,
  from: `0x${string}`,
  broadcast: () => Promise<BroadcastOutcome>,
  revertedMessage: string
): Promise<RelayOutcome> {
  let sent: BroadcastOutcome;
  try {
    sent = await withRelayerLock(async () => refuseWhileHeld(from) ?? (await broadcast()));
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
 * The relayer's fees and next nonce, read under the lock. The fees follow the policy the self-paid
 * path uses: Arbitrum One legitimately reports a zero priority fee, which some serializers reject,
 * and a base-fee spike between estimate and submission is what "max fee per gas less than block
 * base fee" looks like. Only the lock sends, and it is handed on only after the previous
 * eth_sendRawTransaction returned, so `pending` already counts it.
 */
export async function readSendTerms(config: RelayerConfig) {
  const { publicClient } = config;
  const [feeEstimate, block, nonce] = await Promise.all([
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
    publicClient.getTransactionCount({ address: config.relayerAddress, blockTag: 'pending' }),
  ]);
  return { ...feeParamsFor(config.chainId, feeEstimate, block.baseFeePerGas), nonce };
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
    // Not "nothing was sent": a send can time out after the sequencer took it, and a retry of it is
    // then answered "already known". The player must look before signing anything again.
    return refusal('BROADCAST_UNCERTAIN', 'The transaction may or may not have been broadcast.', 502);
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
