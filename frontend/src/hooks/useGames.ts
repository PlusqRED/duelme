import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchGames } from '@/lib/gameApi';
import type { Game, GameCategory } from '@/lib/game';

export function useGames(category?: GameCategory, search?: string) {
  const { data, isLoading } = useQuery<Game[]>({
    queryKey: ['games', category ?? null, search ?? null],
    queryFn: () => fetchGames(category, search),
    staleTime: 60_000,
    // A search typed letter by letter keeps the last list on screen until the next one arrives.
    placeholderData: keepPreviousData,
  });
  // `isRead`: the catalog has answered at least once, so an empty list means no games, not none yet.
  return { games: data ?? [], isLoading, isRead: data !== undefined };
}
