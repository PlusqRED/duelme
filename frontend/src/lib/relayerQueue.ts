/**
 * Serializes relayed transactions so exactly one is ever in flight.
 *
 * The relayer signs from a single EOA, so two concurrent sends would race for the same
 * nonce and one would be dropped or replaced. Chaining every send onto the previous one
 * also means the nonce can be read fresh from the chain inside the critical section
 * instead of being tracked in memory.
 */

/**
 * Requests allowed in the queue at once, the running one included — so at most
 * MAX_QUEUE_DEPTH - 1 are ever waiting behind it.
 */
const MAX_QUEUE_DEPTH = 8;

export class RelayerBusyError extends Error {
  constructor() {
    super('Relayer queue is full — try again in a moment.');
    this.name = 'RelayerBusyError';
  }
}

let tail: Promise<unknown> = Promise.resolve();
let waiting = 0;

export async function withRelayerLock<T>(run: () => Promise<T>): Promise<T> {
  if (waiting >= MAX_QUEUE_DEPTH) {
    throw new RelayerBusyError();
  }

  waiting += 1;
  // `then(run, run)` so a failed predecessor still hands the lock over rather than
  // poisoning the chain for everyone behind it.
  const result = tail.then(run, run);
  tail = result.then(
    () => undefined,
    () => undefined
  );

  try {
    return await result;
  } finally {
    waiting -= 1;
  }
}

/** Test seam — production code never resets the chain. */
export function resetRelayerQueue(): void {
  tail = Promise.resolve();
  waiting = 0;
}
