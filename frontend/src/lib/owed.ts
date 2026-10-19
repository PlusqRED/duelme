import { getContractConfig } from '@/lib/contractConfig';
import { DuelState } from '@/lib/contracts';
import { getClaimableAmountForAddress, isRefundableDuel, type DuelRecord, type SeatSide } from '@/lib/duel';

/**
 * Why the contract holds money for a player: a win to take, a stake coming back, or the stake of a
 * duel whose claim ran out of time, which `refundAndClaimPayouts` closes and pays out in one call.
 */
export type OwedKind = 'win' | 'back' | 'late';

export interface OwedItem {
  duelId: number;
  /** The player's seat in that duel. */
  seat: SeatSide;
  kind: OwedKind;
  /** In USDT's smallest unit. */
  raw: bigint;
}

export interface Owed {
  /** A win first, then stakes coming back, then timed-out claims; the newest duel first within each. */
  items: OwedItem[];
  totalRaw: bigint;
  /** A win is among them, so the money is shown in the payout's sun. */
  hasWin: boolean;
}

/** A bar in the safe's window: one duel's money, or the rest of the duels together. */
export type OwedBar = { kind: 'duel'; item: OwedItem } | { kind: 'more'; raw: bigint; count: number };

const KIND_ORDER: Record<OwedKind, number> = { win: 0, back: 1, late: 2 };

/** The duels `address` sits in, out of the contract's whole history. */
export function duelsOf(duels: readonly DuelRecord[], address: string): DuelRecord[] {
  const viewer = address.toLowerCase();
  return duels.filter((duel) => seatOf(duel, viewer) !== null);
}

/**
 * What the contract keeps for `address` across `duels`, or null when it keeps nothing. Payouts are
 * pull-based, so a win or a refund waits there until the player takes it.
 */
export function owedTo(duels: readonly DuelRecord[], address: string): Owed | null {
  const viewer = address.toLowerCase();
  const items: OwedItem[] = [];

  for (const duel of duels) {
    const seat = seatOf(duel, viewer);
    if (!seat) continue;
    // Still `WinnerClaimed` on chain, so no payout is set yet: what comes back is the stake.
    if (isRefundableDuel(duel)) {
      items.push({ duelId: duel.id, seat, kind: 'late', raw: duel.wagerAmount });
      continue;
    }
    const raw = getClaimableAmountForAddress(duel, viewer);
    if (raw > 0n) {
      items.push({ duelId: duel.id, seat, kind: duel.state === DuelState.Resolved ? 'win' : 'back', raw });
    }
  }

  return summarizeOwed(items);
}

/** The items in the safe's order, with their sum; null for none. */
export function summarizeOwed(items: readonly OwedItem[]): Owed | null {
  if (items.length === 0) {
    return null;
  }
  return {
    items: [...items].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.duelId - a.duelId),
    totalRaw: items.reduce((total, item) => total + item.raw, 0n),
    hasWin: items.some((item) => item.kind === 'win'),
  };
}

/**
 * When the next claim among `duels` runs out of time, in milliseconds since the epoch, or null when
 * none is running. Its stake is owed from then on with no change in what the contract returns.
 */
export function nextLateAt(duels: readonly DuelRecord[]): number | null {
  const { claimTimeout } = getContractConfig();
  const now = Date.now();
  let next: number | null = null;
  for (const duel of duels) {
    if (duel.state !== DuelState.WinnerClaimed || duel.claimTimestamp <= 0n) continue;
    const at = (Number(duel.claimTimestamp) + claimTimeout) * 1000;
    if (at > now && (next === null || at < next)) {
      next = at;
    }
  }
  return next;
}

/** One bar per duel up to `max`; past that, the last bar holds the rest of them. */
export function owedBars(items: readonly OwedItem[], max: number): OwedBar[] {
  if (items.length <= max) {
    return items.map((item) => ({ kind: 'duel', item }));
  }
  const rest = items.slice(max - 1);
  return [
    ...items.slice(0, max - 1).map((item): OwedBar => ({ kind: 'duel', item })),
    { kind: 'more', raw: rest.reduce((total, item) => total + item.raw, 0n), count: rest.length },
  ];
}

function seatOf(duel: DuelRecord, viewer: string): SeatSide | null {
  if (duel.creator.toLowerCase() === viewer) return 'creator';
  if (duel.opponent.toLowerCase() === viewer) return 'opponent';
  return null;
}
