import { useQuery } from '@tanstack/react-query';
import { fetchDuelMeta } from '@/lib/gameApi';
import type { DuelMeta } from '@/lib/game';

export function useDuelMeta(duelId: number | undefined, chainId: number | undefined) {
  const { data, isLoading } = useQuery<DuelMeta | null>({
    queryKey: ['duelMeta', duelId, chainId],
    queryFn: () => fetchDuelMeta(duelId!, chainId!),
    enabled: duelId !== undefined && chainId !== undefined,
    staleTime: 60_000,
  });
  return { meta: data ?? null, isLoading };
}
