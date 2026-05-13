"use client";

import { useQuery } from "@tanstack/react-query";
import { Address } from "@ton/core";
import { addressEquals } from "@/lib/format";
import { readDuel, readDuelCount, type DuelView, DuelState } from "@/lib/ton/duelme";

interface ListOptions {
  /** Filter to duels involving this player (creator or opponent). */
  player?: Address | null;
  /** Filter by exact state(s). Defaults to all states. */
  states?: DuelState[];
  /** Cap on how many of the most recent ids to scan. */
  scanLimit?: number;
}

const CONCURRENT_READS = 4;

/**
 * Walk an array of duel ids in chunks of `CONCURRENT_READS` to avoid
 * blowing past Toncenter's free-tier rate limit (≈1 req/sec). The function
 * returns the list of successfully-fetched duels and the count of rejected
 * reads — callers can surface the rejection count as a banner instead of
 * silently dropping the data.
 */
async function fetchDuels(ids: bigint[]): Promise<{ duels: DuelView[]; failed: number }> {
  const duels: DuelView[] = [];
  let failed = 0;
  for (let i = 0; i < ids.length; i += CONCURRENT_READS) {
    const chunk = ids.slice(i, i + CONCURRENT_READS);
    const results = await Promise.allSettled(chunk.map((id) => readDuel(id)));
    for (const r of results) {
      if (r.status === "fulfilled") {
        duels.push(r.value);
      } else {
        failed += 1;
      }
    }
  }
  return { duels, failed };
}

/**
 * Multicall-style list reader: enumerate the most recent N duels and filter
 * locally. Acceptable for small / mid traffic; once duel counts grow large
 * this should be replaced with an off-chain indexer.
 *
 * The hook surfaces RPC errors via React Query's `isError` / `error` channels
 * so consumers can render a retry banner instead of an empty list.
 */
export function useDuelList(options: ListOptions = {}) {
  const { player = null, states, scanLimit = 30 } = options;

  return useQuery<DuelView[]>({
    queryKey: ["duels:list", player?.toRawString() ?? null, states?.join(",") ?? "*", scanLimit],
    queryFn: async () => {
      const total = await readDuelCount();
      const totalNum = Number(total);
      if (totalNum === 0) {
        return [];
      }
      const start = Math.max(0, totalNum - scanLimit);
      const ids = Array.from({ length: totalNum - start }, (_, i) => BigInt(totalNum - 1 - i));
      const { duels } = await fetchDuels(ids);
      return duels.filter((d) => {
        if (states && !states.includes(d.state)) return false;
        if (player) {
          const isCreator = addressEquals(d.creator, player);
          const isOpponent = d.opponent ? addressEquals(d.opponent, player) : false;
          if (!isCreator && !isOpponent) return false;
        }
        return true;
      });
    },
    // Toncenter free tier is rate-limited; poll less aggressively than single
    // duel reads (which cache hit much more often).
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 1,
    retryDelay: 4000,
  });
}

/**
 * Pick a non-zero payout slot for the player on a given duel.
 * Returns the (unclaimed) amount in nanoTON or null if nothing to claim.
 */
export function pendingPayoutFor(duel: DuelView, player: Address): bigint | null {
  if (addressEquals(duel.creator, player) && duel.creatorPayout > 0n && !duel.creatorClaimed) {
    return duel.creatorPayout;
  }
  if (
    duel.opponent &&
    addressEquals(duel.opponent, player) &&
    duel.opponentPayout > 0n &&
    !duel.opponentClaimed
  ) {
    return duel.opponentPayout;
  }
  return null;
}
