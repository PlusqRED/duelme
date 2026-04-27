import { useQuery } from '@tanstack/react-query';
import { fetchGames } from '@/lib/gameApi';
import type { Game } from '@/lib/game';

const CATALOG_LIMIT = 500;
export const GAME_CATALOG_QUERY_KEY = ['games', 'catalog', CATALOG_LIMIT] as const;

export function useGameCatalog() {
  const { data, isLoading } = useQuery<Game[]>({
    queryKey: GAME_CATALOG_QUERY_KEY,
    queryFn: () => fetchGames(undefined, undefined, CATALOG_LIMIT),
    staleTime: 60_000,
    // Avoid rebuilding the Fuse.js index mid-typing when the user tabs away and back.
    refetchOnWindowFocus: false,
  });
  return { games: data ?? [], isLoading };
}
