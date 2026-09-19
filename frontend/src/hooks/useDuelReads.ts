'use client';

import { useCallback, useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { duelMeAbi, DuelState, type Duel } from '@/lib/contracts';
import { DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import type { DuelRecord } from '@/lib/duel';

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

/** A `getDuels(offset, limit)` page. */
type DuelPageContract = {
  address: `0x${string}`;
  abi: typeof duelMeAbi;
  functionName: 'getDuels';
  args: readonly [bigint, bigint];
  chainId: number;
};

/** A `getDuelsByIds(ids)` page. */
type DuelPageIdsContract = {
  address: `0x${string}`;
  abi: typeof duelMeAbi;
  functionName: 'getDuelsByIds';
  args: readonly [readonly bigint[]];
  chainId: number;
};

/** The query config both paged reads share. */
const duelPageQuery = { refetchInterval: DUEL_POLL_INTERVAL, staleTime: DUEL_POLL_INTERVAL } as const;

/** A `useReadContracts` entry as far as the stitch below cares. */
type DuelPageRequest = { args: readonly unknown[] };

/** One page's answer as far as the stitch below cares. */
type DuelPageResult = { status: 'success' | 'failure'; result?: unknown };

/**
 * Turns page answers into numbered duel records, and says whether any page is missing.
 *
 * The two readers differ only in how they build their page list and how a duel in an answer gets
 * its id. Everything after that was written out twice, so a change to how a failure is reported —
 * or to what counts as a duel at all — was two edits with one of them easy to miss.
 *
 * `idAt` must be stable across renders; both callers wrap it in `useCallback`.
 */
function useStitchedDuels<TRequest extends DuelPageRequest>(
  pageResults: readonly DuelPageResult[] | undefined,
  pageContracts: readonly TRequest[],
  idAt: (request: TRequest, index: number) => number | undefined
) {
  const duels = useMemo<DuelRecord[]>(() => {
    if (!pageResults) return [];

    const records: DuelRecord[] = [];

    pageResults.forEach((page, pageIndex) => {
      // Ids come from the request this page answered, not from the inputs as they stand now: the
      // two can disagree for a render, and pairing by position against the current inputs would
      // label a duel with someone else's id.
      const request = pageContracts[pageIndex];
      if (!request || page.status !== 'success' || !page.result) return;

      (page.result as readonly Duel[]).forEach((duel, index) => {
        const id = idAt(request, index);
        if (id === undefined) return;

        // An id nobody issued reads back as a zeroed struct, which is what `Nonexistent` says.
        // Dropped here rather than by each caller, so a `DuelRecord` means "a duel that exists"
        // everywhere downstream: `getDuelsByIds` is handed backend metadata, which survives a
        // redeploy and can name ids this contract never issued.
        if (duel.state === DuelState.Nonexistent) return;

        records.push({ ...duel, id });
      });
    });

    return records;
  }, [pageResults, pageContracts, idAt]);

  // A page that came back `failure` — a gas cap or a response-size limit on one 200-duel call —
  // is that page's duels missing from an otherwise normal-looking list. Callers surface it rather
  // than rendering a short list as a complete one.
  const hasFailedPage = (pageResults ?? []).some((page) => page.status !== 'success');

  return { duels, hasFailedPage };
}

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

  const pageContracts = useMemo<DuelPageContract[]>(() => {
    if (!isEnabled || !pageCount) return [];

    const pages: DuelPageContract[] = [];
    for (let page = 0; page < pageCount; page++) {
      pages.push({
        address: contractAddress as `0x${string}`,
        abi: duelMeAbi,
        functionName: 'getDuels',
        args: [BigInt(page * DUEL_PAGE_SIZE), BigInt(DUEL_PAGE_SIZE)] as const,
        chainId,
      });
    }

    return pages;
  }, [isEnabled, pageCount, contractAddress, chainId]);

  const { data: pageResults, isLoading: isDuelsLoading, isError: isPagesError, refetch: refetchPages } =
    useReadContracts({
      contracts: pageContracts,
      query: { enabled: pageContracts.length > 0, ...duelPageQuery },
    });

  const idAt = useCallback(
    (request: DuelPageContract, index: number) => Number(request.args[0]) + index,
    []
  );

  const { duels, hasFailedPage } = useStitchedDuels(pageResults, pageContracts, idAt);

  const refetch = useCallback(async () => {
    await Promise.all([refetchCount(), refetchPages()]);
  }, [refetchCount, refetchPages]);

  return {
    duels,
    // A failed count is the quietest way this hook can lie: `count` falls back to 0, no page is
    // ever requested, and the two signals below both read "finished, nothing here". Without it
    // an RPC hiccup renders an empty history as a complete one on every listing screen.
    isError: isCountError || isPagesError || hasFailedPage,
    isLoading: isCountLoading || isDuelsLoading,
    refetch,
  };
}

/** Reads a known set of duel ids, in the same pages as `useDuelRange`. */
export function useDuelsByIds(duelIds: readonly number[], { chainId }: { chainId: number }) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const isEnabled = !!contractAddress && contractAddress !== ZERO_ADDRESS && duelIds.length > 0;

  // The array identity changes on every render; its contents rarely do. wagmi keys its query on
  // the args, so this only has to be stable enough for the memo below.
  const idsKey = duelIds.join(',');

  const pageContracts = useMemo<DuelPageIdsContract[]>(() => {
    if (!isEnabled) return [];

    // Chunked rather than asked for in one call. `getDuelsByIds` loops over whatever it is given,
    // so an unchunked read grows without bound with a game's popularity until one `eth_call`
    // exceeds the provider's gas or response cap — and then the whole set is missing rather than
    // one page of it. This is the same window `getDuels` is read in, for the same reason.
    const pages: DuelPageIdsContract[] = [];
    for (let offset = 0; offset < duelIds.length; offset += DUEL_PAGE_SIZE) {
      pages.push({
        address: contractAddress as `0x${string}`,
        abi: duelMeAbi,
        functionName: 'getDuelsByIds',
        args: [duelIds.slice(offset, offset + DUEL_PAGE_SIZE).map((id) => BigInt(id))] as const,
        chainId,
      });
    }

    return pages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, idsKey, contractAddress, chainId]);

  const { data: pageResults, isLoading, isError: isPagesError } = useReadContracts({
    contracts: pageContracts,
    query: { enabled: pageContracts.length > 0, ...duelPageQuery },
  });

  const idAt = useCallback((request: DuelPageIdsContract, index: number) => {
    const id = request.args[0][index];
    return id === undefined ? undefined : Number(id);
  }, []);

  const { duels, hasFailedPage } = useStitchedDuels(pageResults, pageContracts, idAt);

  return { duels, isLoading, isError: isPagesError || hasFailedPage };
}
