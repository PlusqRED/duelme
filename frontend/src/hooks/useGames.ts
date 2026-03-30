import { useQuery } from '@tanstack/react-query';
import { fetchGames } from '@/lib/gameApi';
import type { Game, GameCategory } from '@/lib/game';

export function useGames(category?: GameCategory, search?: string) {
  const { data, isLoading } = useQuery<Game[]>({
    queryKey: ['games', category ?? null, search ?? null],
    queryFn: () => fetchGames(category, search),
    staleTime: 60_000,
  });
  return { games: data ?? [], isLoading };
}
