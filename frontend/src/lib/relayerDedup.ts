import { encodeFunctionData, keccak256, type Hex } from 'viem';
import { erc2771ForwarderAbi } from '@/lib/contracts';
import { toForwardRequestArgs, type RelayForwardRequest, type RelayOutcome } from '@/lib/relayRequest';

/**
 * Collapses repeats of one signed forward request into a single relay.
 *
 * A request that is being relayed, or was relayed a moment ago, still passes the
 * forwarder's `verify` until its transaction is mined and spends the signer's nonce. Sent
 * again in that window it buys a second transaction, which reverts on the spent nonce and
 * burns the relayer's gas. A replay of a payload someone saw, or any client posting the
 * same body twice, looks like that — so every copy shares the first one's outcome, the same
 * transaction hash, and only the first is ever sent. (The app itself signs afresh on every
 * attempt; relayerSignerHold covers its retries.)
 *
 * Only a success is remembered past its own request. A refusal sent nothing, so the same
 * signed request may try again once whatever refused it has changed.
 *
 * State is in-memory and per-process, with the same reach as the budget ledger.
 */

/** How long a relayed request keeps answering with its transaction hash. */
export const RELAY_REPEAT_TTL_MS = 10 * 60_000;

/**
 * Entries kept before settled ones are dropped, oldest first. Requests still being relayed
 * are never dropped — that would let their copies through — and are bounded by how many
 * requests can be in progress at once rather than by this.
 */
export const MAX_REMEMBERED_RELAYS = 2_000;

interface Entry {
  outcome: Promise<RelayOutcome>;
  settledAt: number | null;
}

const entries = new Map<Hex, Entry>();

/**
 * Identifies the whole signed request, not just its signature: a copy of someone's
 * signature on altered fields must not inherit — or pre-empt — the real request's outcome.
 * It hashes the `execute` calldata the request would be sent as, which is blind to address
 * and hex letter case.
 */
export function relayRequestKey(request: RelayForwardRequest): Hex {
  return keccak256(
    encodeFunctionData({
      abi: erc2771ForwarderAbi,
      functionName: 'execute',
      args: [toForwardRequestArgs(request)],
    })
  );
}

export function relayOnce(
  key: Hex,
  relay: () => Promise<RelayOutcome>,
  now: () => number = Date.now
): Promise<RelayOutcome> {
  const at = now();
  const existing = entries.get(key);

  if (existing && !isExpired(existing, at)) {
    return existing.outcome;
  }

  entries.delete(key);
  makeRoom(at);

  const entry: Entry = { outcome: relay(), settledAt: null };
  entries.set(key, entry);

  entry.outcome.then(
    (outcome) => {
      if (outcome.ok) {
        entry.settledAt = now();
      } else {
        forget(key, entry);
      }
    },
    () => forget(key, entry)
  );

  return entry.outcome;
}

function forget(key: Hex, entry: Entry): void {
  if (entries.get(key) === entry) {
    entries.delete(key);
  }
}

function isExpired(entry: Entry, at: number): boolean {
  return entry.settledAt !== null && at - entry.settledAt >= RELAY_REPEAT_TTL_MS;
}

function makeRoom(at: number): void {
  // Insertion order is close to settle order, since every relay settles within minutes.
  for (const [key, entry] of entries) {
    if (entries.size < MAX_REMEMBERED_RELAYS && !isExpired(entry, at)) {
      return;
    }
    if (entry.settledAt !== null) {
      entries.delete(key);
    }
  }
}

/** Test seam — production code never clears the entries. */
export function resetRelayDedup(): void {
  entries.clear();
}

/** Test seam — how many requests are remembered right now. */
export function trackedRelayRequests(): number {
  return entries.size;
}
