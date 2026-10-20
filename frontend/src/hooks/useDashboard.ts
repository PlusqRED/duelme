'use client';

import { useCallback, useMemo } from 'react';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useDuelMetas } from '@/hooks/useDuelMetas';
import { useDuelRange } from '@/hooks/useDuelReads';
import { useNicknames } from '@/hooks/useNicknames';
import { useClockValue } from '@/hooks/useNow';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { myDuels, myTotals, otherOf, phaseClock } from '@/lib/dashboard';
import type { GameCategory } from '@/lib/game';
import { duelsOf, owedTo } from '@/lib/owed';

/** The game a duel was created for, as the backend names it. */
export interface DuelGame {
  name: string;
  category: GameCategory | null;
}

/**
 * The reader's duels on the network duels run on, filed for the dashboard: those on, by whose move
 * it is, the finished ones, what the contract keeps for them and their totals, with each duel's game
 * and the other players' names. Read from the same history the top bar's safe reads, so the page
 * asks for nothing new. A reported win whose time to answer runs out moves to the history, and its
 * stake into the safe, by itself.
 */
export function useDashboard(walletAddress: `0x${string}`) {
  const { claimTimeout } = useContractConfig();
  const { duels, isLoading, isError, refetch, retry } = useDuelRange({ chainId: DEFAULT_CHAIN_ID });
  const mine = useMemo(() => duelsOf(duels, walletAddress), [duels, walletAddress]);
  // The phases change with the clock only when a time to answer runs out, so this moment, not every
  // second, is what the board is filed by.
  const now = useClockValue((at) => phaseClock(mine, at, claimTimeout));
  const split = useMemo(() => myDuels(mine, walletAddress, now, claimTimeout), [mine, walletAddress, now, claimTimeout]);
  const all = useMemo(() => [...split.yours, ...split.theirs, ...split.past], [split]);
  const totals = useMemo(() => myTotals(all), [all]);
  const entryById = useMemo(() => new Map(all.map((entry) => [entry.duel.id, entry])), [all]);

  const ids = useMemo(() => mine.map((duel) => duel.id), [mine]);
  const { metaByDuelId } = useDuelMetas(ids, DEFAULT_CHAIN_ID);
  const gameOf = useCallback(
    (duelId: number): DuelGame | null => {
      const meta = metaByDuelId[duelId];
      return meta ? { name: meta.gameName, category: meta.category } : null;
    },
    [metaByDuelId]
  );

  const others = useMemo(() => all.map((entry) => otherOf(entry) ?? undefined), [all]);
  const { resolveDisplay } = useNicknames(others);

  return {
    ...split,
    // Worked out on every render, like the top bar's: a claim running out changes it with no new data.
    owed: owedTo(mine, walletAddress),
    totals,
    entryById,
    claimTimeout,
    hasDuels: all.length > 0,
    gameOf,
    nameOf: resolveDisplay,
    isLoading,
    isError,
    refetch,
    retry,
  };
}
