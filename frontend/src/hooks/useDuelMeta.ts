import { useQuery } from '@tanstack/react-query';
import { fetchDuelMeta } from '@/lib/gameApi';
import { DUELME_ADDRESSES } from '@/lib/constants';
import type { DuelMeta } from '@/lib/game';

/**
 * The game a duel was created for, from the backend; null for a duel created without one. Keyed by
 * the contract too: ids restart at zero on a redeploy, so duel 3 of the old contract is not duel 3
 * of the new one.
 */
export function useDuelMeta(duelId: number | undefined, chainId: number | undefined) {
  const contractAddress = chainId !== undefined ? DUELME_ADDRESSES[chainId] : undefined;

  const { data, isLoading } = useQuery<DuelMeta | null>({
    queryKey: ['duelMeta', chainId, contractAddress?.toLowerCase(), duelId],
    queryFn: () => fetchDuelMeta(duelId!, chainId!, contractAddress!),
    enabled: duelId !== undefined && !!contractAddress,
    staleTime: 60_000,
  });
  return { meta: data ?? null, isLoading };
}
