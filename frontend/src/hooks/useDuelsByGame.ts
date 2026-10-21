import { useQuery } from '@tanstack/react-query';
import { fetchDuelsByGame } from '@/lib/gameApi';
import { DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';

export function useDuelsByGame(gameSlug: string | undefined, chainId: number) {
  const contractAddress = DUELME_ADDRESSES[chainId];

  const { data, isLoading, isError, refetch } = useQuery<DuelMeta[]>({
    queryKey: ['duelsByGame', gameSlug, chainId],
    queryFn: () => fetchDuelsByGame(gameSlug!, chainId, contractAddress),
    enabled: !!gameSlug && !!contractAddress,
    staleTime: 30_000,
  });
  // Also an error when a later read fails over the list it kept: that list may be out of date.
  return { duels: data ?? [], isLoading, isError, refetch };
}
