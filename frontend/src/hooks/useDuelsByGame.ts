import { useQuery } from '@tanstack/react-query';
import { fetchDuelsByGame } from '@/lib/gameApi';
import type { DuelMeta } from '@/lib/game';

export function useDuelsByGame(gameSlug: string | undefined) {
  const { data, isLoading } = useQuery<DuelMeta[]>({
    queryKey: ['duelsByGame', gameSlug],
    queryFn: () => fetchDuelsByGame(gameSlug!),
    enabled: !!gameSlug,
    staleTime: 30_000,
  });
  return { duels: data ?? [], isLoading };
}
