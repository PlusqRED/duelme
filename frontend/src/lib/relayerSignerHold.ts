import type { Hex } from 'viem';
import { refusal, type RelayRefusal } from '@/lib/relayRequest';

/**
 * Holds a signer back while their last relayed transaction is unconfirmed.
 *
 * Their next request was signed against the forwarder nonce that transaction is about to
 * spend, so once it lands the new one reverts on-chain and burns the relayer's gas. A retry the
 * player starts, or a second tab, signs afresh, so it is a different request rather than a copy
 * the repeat check could recognise — it is refused here instead. (An answer lost on the way back
 * is posted again as the same request, and the repeat check does recognise that.)
 *
 * The hold is lifted by the transaction's receipt. If the relayer stops waiting before one
 * arrives, the hold outlives the request, since the transaction may still land.
 *
 * State is in-memory and per-process, with the same reach as the budget ledger.
 */

/** Longest a signer is held back — the backstop for a receipt that never arrives. */
export const SIGNER_HOLD_MS = 10 * 60_000;

interface Hold {
  hash: Hex;
  expiresAt: number;
}

const holds = new Map<string, Hold>();

export function refuseWhileHeld(signer: string, now: number = Date.now()): RelayRefusal | null {
  const hold = holds.get(signer.toLowerCase());

  return hold && hold.expiresAt > now
    ? refusal(
        'RELAY_PENDING',
        "This wallet's previous relayed transaction is still being confirmed — try again in a moment.",
        409
      )
    : null;
}

export function holdSigner(signer: string, hash: Hex, now: number = Date.now()): void {
  for (const [held, hold] of holds) {
    if (hold.expiresAt <= now) {
      holds.delete(held);
    }
  }
  holds.set(signer.toLowerCase(), { hash, expiresAt: now + SIGNER_HOLD_MS });
}

/** Lifts the hold this transaction placed, and only that one. */
export function releaseSigner(signer: string, hash: Hex): void {
  const key = signer.toLowerCase();
  if (holds.get(key)?.hash === hash) {
    holds.delete(key);
  }
}

/** Test seam — production code never clears the holds. */
export function resetSignerHolds(): void {
  holds.clear();
}
