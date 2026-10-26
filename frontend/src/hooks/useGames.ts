import { useQuery } from '@tanstack/react-query';
import { fetchGames } from '@/lib/gameApi';
import type { Game } from '@/lib/game';

export function useGames() {
  const { data, isLoading } = useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: () => fetchGames(),
    staleTime: 60_000,
  });
  return { games: data ?? [], isLoading };
}
