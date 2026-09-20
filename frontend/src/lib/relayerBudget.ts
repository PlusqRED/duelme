/**
 * Daily gas budgets for the relayer: one per address, one for the relayer as a whole.
 *
 * The signer of a forward request cannot be forged — the forwarder recovers it from an
 * EIP-712 signature — so the address is a sound key to meter on without any extra login.
 * It is not, however, scarce: anyone can generate keys, and each new address would start
 * with a fresh allowance. The global cap is what bounds the damage from that, capping the
 * relayer's total daily spend no matter how many addresses ask.
 *
 * State is in-memory and therefore per-process: it resets on redeploy and would not be
 * shared across replicas. The frontend runs as a single container per environment, so that
 * is accurate today; running more than one replica means moving this into a shared store.
 */

/** How many addresses to track before sweeping stale days out. */
const MAX_TRACKED_ADDRESSES = 5_000;

interface DailySpend {
  day: string;
  spentWei: bigint;
}

const spendByAddress = new Map<string, DailySpend>();
let globalSpend: DailySpend = { day: '', spentWei: 0n };

export interface DailyBudgetLimits {
  perAddressWei: bigint;
  globalWei: bigint;
}

export type BudgetDecision =
  | { allowed: true; spentWei: bigint; remainingWei: bigint }
  | { allowed: false; exceeded: 'address' | 'global'; spentWei: bigint; remainingWei: bigint };

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function spendFor(entry: DailySpend | undefined, day: string): bigint {
  return entry && entry.day === day ? entry.spentWei : 0n;
}

/**
 * Admits a request only if its worst-case cost still fits both budgets, and books that
 * worst case immediately. Booking up front — rather than after the receipt — is what keeps
 * a caller from slipping several expensive requests past the cap concurrently.
 */
export function reserveDailyBudget(
  address: string,
  worstCaseWei: bigint,
  limits: DailyBudgetLimits,
  now: Date = new Date()
): BudgetDecision {
  const key = address.toLowerCase();
  const day = utcDay(now);
  const addressSpent = spendFor(spendByAddress.get(key), day);
  const globalSpent = spendFor(globalSpend, day);

  if (addressSpent + worstCaseWei > limits.perAddressWei) {
    return {
      allowed: false,
      exceeded: 'address',
      spentWei: addressSpent,
      remainingWei: remaining(limits.perAddressWei, addressSpent),
    };
  }

  if (globalSpent + worstCaseWei > limits.globalWei) {
    // Nothing is booked here: the address is within its own allowance and must not be
    // charged for a refusal caused by everyone else's usage.
    return {
      allowed: false,
      exceeded: 'global',
      spentWei: globalSpent,
      remainingWei: remaining(limits.globalWei, globalSpent),
    };
  }

  sweepIfCrowded(day);
  const spentWei = addressSpent + worstCaseWei;
  spendByAddress.set(key, { day, spentWei });
  globalSpend = { day, spentWei: globalSpent + worstCaseWei };

  return { allowed: true, spentWei, remainingWei: limits.perAddressWei - spentWei };
}

/**
 * Replaces a reservation with what the transaction actually cost, on both ledgers. Called
 * once the receipt is in; on a timeout the reservation is simply left standing, which errs
 * toward charging for gas that may still be spent.
 */
export function settleDailyBudget(
  address: string,
  reservedWei: bigint,
  actualWei: bigint,
  now: Date = new Date()
): void {
  const key = address.toLowerCase();
  const day = utcDay(now);
  const entry = spendByAddress.get(key);

  // A day rollover between reserve and settle means the reservation is no longer on the
  // books; charging the new day for it would be wrong.
  if (entry && entry.day === day) {
    spendByAddress.set(key, { day, spentWei: correct(entry.spentWei, reservedWei, actualWei) });
  }

  if (globalSpend.day === day) {
    globalSpend = { day, spentWei: correct(globalSpend.spentWei, reservedWei, actualWei) };
  }
}

/** Releases a reservation whose transaction never made it onto the chain. */
export function releaseDailyBudget(address: string, reservedWei: bigint, now: Date = new Date()): void {
  settleDailyBudget(address, reservedWei, 0n, now);
}

function correct(booked: bigint, reservedWei: bigint, actualWei: bigint): bigint {
  const corrected = booked - reservedWei + actualWei;
  return corrected > 0n ? corrected : 0n;
}

function remaining(limit: bigint, spent: bigint): bigint {
  return limit > spent ? limit - spent : 0n;
}

function sweepIfCrowded(today: string): void {
  if (spendByAddress.size < MAX_TRACKED_ADDRESSES) {
    return;
  }

  for (const [address, entry] of spendByAddress) {
    if (entry.day !== today) {
      spendByAddress.delete(address);
    }
  }
}

/** Test seam — production code never clears the ledgers. */
export function resetDailyBudgets(): void {
  spendByAddress.clear();
  globalSpend = { day: '', spentWei: 0n };
}
