'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDuelMetaBatch } from '@/lib/gameApi';
import type { DuelMeta } from '@/lib/game';

export function useOpenDuelMetas(duelIds: number[], chainId: number) {
  const sortedIds = useMemo(
    () => [...duelIds].sort((a, b) => a - b),
    [duelIds],
  );

  const { data } = useQuery<DuelMeta[]>({
    queryKey: ['duelMeta', 'batch', chainId, sortedIds],
    queryFn: () => fetchDuelMetaBatch(chainId, sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: 30_000,
  });

  const metaByDuelId = useMemo<Record<number, DuelMeta>>(() => {
    const result: Record<number, DuelMeta> = {};
    if (!data) return result;
    for (const meta of data) {
      result[meta.duelId] = meta;
    }
    return result;
  }, [data]);

  return { metaByDuelId };
}
