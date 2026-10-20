'use client';

import { useReadContract } from 'wagmi';
import { ACTIVE_STATES, DuelState, duelMeAbi, type Duel } from '@/lib/contracts';
import { DUELME_ADDRESSES, LIVE_DATA_POLL_INTERVAL, ZERO_ADDRESS } from '@/lib/constants';
import { isDuelFullySettled } from '@/lib/duel';

/** Reads of an id that is not a duel, about a minute's worth, before the page stops asking. */
const NONEXISTENT_DUEL_READS = 6;

/**
 * A duel that is over and fully paid out cannot change again, so it is not polled. Until then it
 * is: a duel that is over still changes when a player takes their payout. `Nonexistent` is read
 * a few more times, because a duel created a moment ago can read that from a node that lags
 * behind; an id nobody issued stops there.
 */
function duelPollInterval(duel: Duel | undefined, reads: number): number | false {
  if (!duel || ACTIVE_STATES.has(duel.state)) {
    return LIVE_DATA_POLL_INTERVAL;
  }

  if (duel.state === DuelState.Nonexistent) {
    return reads < NONEXISTENT_DUEL_READS ? LIVE_DATA_POLL_INTERVAL : false;
  }

  return isDuelFullySettled(duel) ? false : LIVE_DATA_POLL_INTERVAL;
}

interface UseDuelResult {
  duel: Duel | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

export function useDuel(duelId: bigint, chainId: number): UseDuelResult {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data, isLoading, isLoadingError, refetch } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'getDuel',
    args: [duelId],
    chainId,
    // The other player moves on their own schedule: without polling, their join, claim or
    // confirmation would only show after a reload or a write of the viewer's own.
    query: {
      enabled: !!contractAddress && contractAddress !== ZERO_ADDRESS,
      refetchInterval: (query) => duelPollInterval(query.state.data, query.state.dataUpdateCount),
      staleTime: 0,
    },
  });

  // The decoded struct is already the shape `Duel` describes — spelling the fields out again is
  // how `invitedOpponent` went missing here once. Handed through rather than spread: wagmi's
  // `data` is referentially stable between refetches, and a fresh object each render would
  // re-fire every `[duel]` effect on the duel page, including one that writes to localStorage.
  //
  // Annotated, never asserted. `data as Duel` would keep compiling after the ABI stopped decoding
  // a field `Duel` declares — `Duel` is assignable to the narrower decoded type, so the assertion
  // stays legal and `duel.invitedOpponent` is `undefined` at runtime. An annotation is checked the
  // strict way round, so that drift fails here instead of as a TypeError on the duel page.
  const duel: Duel | undefined = data;

  // Only a duel that never loaded is an error: a poll that fails keeps the last duel on screen,
  // with any signing window above it, until the next poll reads it again.
  return { duel, isLoading, isError: isLoadingError, refetch };
}
