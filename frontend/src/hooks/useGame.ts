import { useQuery } from '@tanstack/react-query';
import { fetchGameBySlug } from '@/lib/gameApi';
import type { Game } from '@/lib/game';

/**
 * One game of the catalog by its slug: null when the catalog has no such game, which a failed read is
 * not. A game the page server already settled is used as it is, with no second read; a fallback (a
 * guide's game) stands in while the read runs, and after it when the catalog has none or fails.
 */
export function useGame(slug: string, serverGame?: Game, fallbackGame?: Game) {
  const { data, isLoading, isError, refetch } = useQuery<Game | null>({
    queryKey: ['game', slug],
    queryFn: () => fetchGameBySlug(slug),
    enabled: !!slug && !serverGame,
    initialData: serverGame,
    staleTime: 60_000,
  });
  return { game: data ?? fallbackGame ?? null, isLoading, isError, refetch };
}
