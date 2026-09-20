import { useQuery } from '@tanstack/react-query';
import { fetchDuelMeta } from '@/lib/gameApi';
import { DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';

export function useDuelMeta(duelId: number | undefined, chainId: number | undefined) {
  const contractAddress = chainId !== undefined ? DUELME_ADDRESSES[chainId] : undefined;

  const { data, isLoading } = useQuery<DuelMeta | null>({
    queryKey: ['duelMeta', duelId, chainId],
    queryFn: () => fetchDuelMeta(duelId!, chainId!, contractAddress!),
    enabled: duelId !== undefined && !!contractAddress,
    staleTime: 60_000,
  });
  return { meta: data ?? null, isLoading };
}
