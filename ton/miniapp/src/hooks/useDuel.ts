"use client";

import { useQuery } from "@tanstack/react-query";
import { readDuel, readDuelCount, type DuelView } from "@/lib/ton/duelme";

/** Read a single duel by id. Polls every 10s by default. */
export function useDuel(duelId: bigint | undefined) {
  return useQuery<DuelView>({
    queryKey: ["duel", duelId?.toString() ?? null],
    queryFn: () => {
      if (duelId === undefined) {
        throw new Error("duelId required");
      }
      return readDuel(duelId);
    },
    enabled: duelId !== undefined,
    staleTime: 0,
    refetchInterval: 10_000,
  });
}

/** Total number of duels ever created. */
export function useDuelCount() {
  return useQuery<bigint>({
    queryKey: ["duelCount"],
    queryFn: () => readDuelCount(),
    refetchInterval: 15_000,
  });
}
