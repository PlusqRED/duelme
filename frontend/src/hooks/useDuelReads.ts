'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { duelMeAbi, type Duel } from '@/lib/contracts';
import { DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';

/**
 * How many duels one `getDuels` call carries.
 *
 * Every listing screen used to issue one `getDuel` per duel that had ever existed, on a 10–15s
 * refresh — so the work a single visitor put on the RPC grew with the whole history of the
 * contract. The contract now exposes windowed reads; this is the window. 200 keeps a page's
 * response well under provider response limits while cutting the call count by the same factor.
 *
 * The limit is passed as this constant even for the final, partial page: the contract clamps it
 * to `duelCount` anyway, and a limit that shrank with the count would change the query key of
 * every page each time a duel is created anywhere, discarding the cached history and forcing an
 * immediate full re-read.
 */
const DUEL_PAGE_SIZE = 200;

/**
 * How often the listing screens re-read the chain.
 *
 * One value on purpose. These hooks resolve to the same wagmi queries, so the data is shared —
 * but each observer keeps its own timer, and a 10s and a 15s observer on the same screen make
 * the shared query fetch on the union of both (10 fetches a minute where 6 were intended).
 *
 * The readers below set `staleTime` to this value rather than the project's usual zero. These are
 * the heaviest reads in the app — every page of the contract's history — and marking them stale on
 * arrival means each screen that mounts a reader downloads the lot again. Clicking through four
 * listing screens inside one poll window paid for four full reads of identical data. What keeps
 * the data live is the `refetchInterval`, which is unchanged.
 */
const DUEL_POLL_INTERVAL = 10_000;

/** A duel as the contract's `DuelView` returns it, plus the id it was read at. */
export type DuelRecord = Duel & { id: number };

interface DuelRangeOptions {
  chainId: number;
  enabled?: boolean;
}

/** Reads every duel in `getDuels` pages instead of one call per duel. */
export function useDuelRange({ chainId, enabled = true }: DuelRangeOptions) {
  // Resolved here rather than by each caller, like `useDuel` and `useContractConfig` do: a hook
  // that took both could be handed an address and a chain id that disagree.
  const contractAddress = DUELME_ADDRESSES[chainId];
  const isEnabled = enabled && !!contractAddress && contractAddress !== ZERO_ADDRESS;

  const {
    data: duelCount,
    isLoading: isCountLoading,
    isError: isCountError,
    refetch: refetchCount,
  } = useReadContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'duelCount',
    chainId,
    query: { enabled: isEnabled, refetchInterval: DUEL_POLL_INTERVAL, staleTime: DUEL_POLL_INTERVAL },
  });

  const count = duelCount ? Number(duelCount) : 0;
  // Keyed on the number of pages, not on `count`: the offsets and the limit are the same array
  // until a page is added, so depending on the count rebuilt it — and re-spread every duel in
  // history through the memos downstream — every time anyone anywhere created a duel.
  const pageCount = Math.ceil(count / DUEL_PAGE_SIZE);

  const pageContracts = useMemo(() => {
    if (!isEnabled || !pageCount) return [];

    const pages = [];
    for (let page = 0; page < pageCount; page++) {
      pages.push({
        address: contractAddress as `0x${string}`,
        abi: duelMeAbi,
        functionName: 'getDuels' as const,
        args: [BigInt(page * DUEL_PAGE_SIZE), BigInt(DUEL_PAGE_SIZE)] as const,
        chainId,
      });
    }

    return pages;
  }, [isEnabled, pageCount, contractAddress, chainId]);

  const { data: pageResults, isLoading: isDuelsLoading, isError: isPagesError, refetch: refetchPages } = useReadContracts({
    contracts: pageContracts,
    query: { enabled: pageContracts.length > 0, refetchInterval: DUEL_POLL_INTERVAL, staleTime: DUEL_POLL_INTERVAL },
  });

  const duels = useMemo<DuelRecord[]>(() => {
    if (!pageResults) return [];

    const records: DuelRecord[] = [];

    pageResults.forEach((page, pageIndex) => {
      // The id comes from the offset this page was *requested* at, not from a recomputed window.
      // `count` moves as duels are created, so deriving it again here would renumber every record
      // whenever the results in hand are one poll behind the count. That also means the two
      // arrays can disagree for a render, so the request is looked up rather than assumed.
      const request = pageContracts[pageIndex];
      if (!request || page.status !== 'success' || !page.result) return;

      const offset = Number(request.args[0]);

      (page.result as readonly Duel[]).forEach((duel, index) => {
        records.push({ ...duel, id: offset + index });
      });
    });

    return records;
  }, [pageResults, pageContracts]);

  // A page that came back `failure` — a gas cap or a response-size limit on one 200-duel call —
  // is 200 duels missing from an otherwise normal-looking list. Callers surface it rather than
  // rendering a short history as a complete one.
  const hasFailedPage = (pageResults ?? []).some((page) => page.status !== 'success');

  return {
    duels,
    // A failed count is the quietest way this hook can lie: `count` falls back to 0, no page is
    // ever requested, and the two signals below both read "finished, nothing here". Without it
    // an RPC hiccup renders an empty history as a complete one on every listing screen.
    isError: isCountError || isPagesError || hasFailedPage,
    isLoading: isCountLoading || isDuelsLoading,
    refetch: async () => {
      await Promise.all([refetchCount(), refetchPages()]);
    },
  };
}

/** Reads a known set of duel ids, in the same pages as `useDuelRange`. */
export function useDuelsByIds(duelIds: readonly number[], { chainId }: { chainId: number }) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const isEnabled = !!contractAddress && contractAddress !== ZERO_ADDRESS && duelIds.length > 0;

  // The array identity changes on every render; its contents rarely do. wagmi keys its query on
  // the args, so this only has to be stable enough for the memo below.
  const idsKey = duelIds.join(',');

  const pageContracts = useMemo(() => {
    if (!isEnabled) return [];

    // Chunked rather than asked for in one call. `getDuelsByIds` loops over whatever it is given,
    // so an unchunked read grows without bound with a game's popularity until one `eth_call`
    // exceeds the provider's gas or response cap — and then the whole set is missing rather than
    // one page of it. This is the same window `getDuels` is read in, for the same reason.
    const pages = [];
    for (let offset = 0; offset < duelIds.length; offset += DUEL_PAGE_SIZE) {
      pages.push({
        address: contractAddress as `0x${string}`,
        abi: duelMeAbi,
        functionName: 'getDuelsByIds' as const,
        args: [duelIds.slice(offset, offset + DUEL_PAGE_SIZE).map((id) => BigInt(id))] as const,
        chainId,
      });
    }

    return pages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, idsKey, contractAddress, chainId]);

  const { data: pageResults, isLoading, isError: isPagesError } = useReadContracts({
    contracts: pageContracts,
    query: { enabled: pageContracts.length > 0, refetchInterval: DUEL_POLL_INTERVAL, staleTime: DUEL_POLL_INTERVAL },
  });

  const duels = useMemo<DuelRecord[]>(() => {
    if (!pageResults) return [];

    const records: DuelRecord[] = [];

    pageResults.forEach((page, pageIndex) => {
      // Ids come from the request this page answered, not from `duelIds` as it stands now: the
      // two can disagree for a render, and pairing by position against the current array would
      // label a duel with someone else's id.
      const request = pageContracts[pageIndex];
      if (!request || page.status !== 'success' || !page.result) return;

      const requestedIds = request.args[0];

      (page.result as readonly Duel[]).forEach((duel, index) => {
        const id = requestedIds[index];
        if (id === undefined) return;
        records.push({ ...duel, id: Number(id) });
      });
    });

    return records;
  }, [pageResults, pageContracts]);

  // A page that came back `failure` is that page's duels missing from an otherwise normal-looking
  // list — the same "a short list rendered as a complete one" `useDuelRange` reports, and the
  // callers surface it the same way.
  const hasFailedPage = (pageResults ?? []).some((page) => page.status !== 'success');

  return { duels, isLoading, isError: isPagesError || hasFailedPage };
}
