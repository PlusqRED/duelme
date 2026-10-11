/**
 * Per-client ceiling on relay POSTs.
 *
 * A validly signed request costs its sender nothing — keys are free, and no ETH or USDT is
 * needed to sign — yet every one that parses costs the relayer RPC round trips. Without a
 * ceiling, one client could keep that RPC busy for everyone. It is generous on purpose: a
 * whole duel is a handful of relayed actions, and a player never sends many a minute.
 *
 * The client is the right-most `X-Forwarded-For` entry. Caddy, the only way in (the
 * container listens on 127.0.0.1 alone, with no CDN in front), has no `trusted_proxies` and
 * so replaces whatever the client sent with the address it saw. Put a CDN in front of Caddy
 * and that entry becomes the CDN's, turning this into one bucket for everyone — the rule
 * has to change with it. Neither domain has an AAAA record, so IPv6 addresses are counted
 * one by one rather than per /64.
 *
 * State is in-memory and per-process, with the same reach as the budget ledger.
 */

export const RELAY_POSTS_PER_MINUTE = 30;

const WINDOW_MS = 60_000;

/**
 * Clients tracked at once. Past it the oldest window is dropped, which resets that client's
 * count — far cheaper than letting a stream of distinct addresses grow the map without end.
 */
const MAX_TRACKED_CLIENTS = 10_000;

/** One shared bucket for requests that name no client at all. */
const UNKNOWN_CLIENT = 'unknown';

interface ClientWindow {
  startedAt: number;
  count: number;
}

// Insertion order is window start order: a client is re-inserted whenever its window
// restarts, so the oldest window is always the first key.
const windows = new Map<string, ClientWindow>();

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function relayClientAddress(headers: Headers): string {
  const rightMost = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim().toLowerCase();
  return rightMost || UNKNOWN_CLIENT;
}

/**
 * Counts one POST against the client's window, which opens with its first request and runs
 * for a minute — so the 31st request inside that minute is refused however fast or slow the
 * first 30 came.
 */
export function takeRelayRateLimit(client: string, now: number = Date.now()): RateLimitDecision {
  const current = windows.get(client);

  if (current && now - current.startedAt < WINDOW_MS) {
    if (current.count >= RELAY_POSTS_PER_MINUTE) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.startedAt + WINDOW_MS - now) / 1000)),
      };
    }

    current.count += 1;
    return { allowed: true };
  }

  windows.delete(client);
  makeRoom(now);
  windows.set(client, { startedAt: now, count: 1 });
  return { allowed: true };
}

function makeRoom(now: number): void {
  if (windows.size < MAX_TRACKED_CLIENTS) {
    return;
  }

  // Oldest first: drop every closed window, and open ones only while the map is still full.
  for (const [client, window] of windows) {
    if (windows.size < MAX_TRACKED_CLIENTS && now - window.startedAt < WINDOW_MS) {
      return;
    }
    windows.delete(client);
  }
}

/** Test seam — production code never clears the windows. */
export function resetRelayRateLimit(): void {
  windows.clear();
}

/** Test seam — how many clients are tracked right now. */
export function trackedRelayClients(): number {
  return windows.size;
}
