'use client';

import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';
import { duelMetaBatches, fetchDuelMetaBatch } from '@/lib/gameApi';

/** The games of every batch that has answered, by duel id; module-level so the combined map is kept while nothing changes. */
function byDuelId(results: UseQueryResult<DuelMeta[]>[]): Record<number, DuelMeta> {
  const metas: Record<number, DuelMeta> = {};
  for (const result of results) {
    for (const meta of result.data ?? []) metas[meta.duelId] = meta;
  }
  return metas;
}

/**
 * The game each of `duelIds` was created for, from the backend, asked for in batches it accepts:
 * a player's whole history can run past the backend's limit, and one request over it is refused
 * whole. Keyed by the contract too, since ids restart at zero on a redeploy. A duel created without
 * a game, or whose batch has not answered yet, has no entry.
 */
export function useDuelMetas(duelIds: readonly number[], chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];
  const batches = useMemo(() => duelMetaBatches(duelIds), [duelIds]);

  const metaByDuelId = useQueries({
    queries: batches.map((ids) => ({
      queryKey: ['duelMeta', 'batch', chainId, contractAddress?.toLowerCase(), ids],
      queryFn: () => fetchDuelMetaBatch(chainId, contractAddress, ids),
      enabled: !!contractAddress,
      staleTime: 30_000,
    })),
    combine: byDuelId,
  });

  return { metaByDuelId };
}
