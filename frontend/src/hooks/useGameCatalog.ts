import { useQuery } from '@tanstack/react-query';
import { fetchGames } from '@/lib/gameApi';
import type { Game } from '@/lib/game';

const CATALOG_LIMIT = 500;

export function useGameCatalog() {
  const { data, isLoading } = useQuery<Game[]>({
    queryKey: ['games', 'catalog', CATALOG_LIMIT],
    queryFn: () => fetchGames(undefined, undefined, CATALOG_LIMIT),
    staleTime: 60_000,
  });
  return { games: data ?? [], isLoading };
}
