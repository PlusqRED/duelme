import { useQuery } from '@tanstack/react-query';
import { fetchGameBySlug } from '@/lib/gameApi';
import type { Game, KnownGame } from '@/lib/game';

const UNSETTLED: KnownGame = { status: 'unsettled' };

/**
 * One game of the catalog by its slug: null when the catalog has no such game, which a failed read is
 * not. A game the page server settled is the answer as it is, with no read. Otherwise the browser
 * reads it, a fallback (a guide's game) standing in while it does, and after when the catalog has
 * none or fails.
 */
export function useGame(slug: string, known: KnownGame = UNSETTLED) {
  const settled = known.status === 'settled' ? known.game : undefined;
  const { data, isLoading, isError, refetch } = useQuery<Game | null>({
    queryKey: ['game', slug],
    queryFn: () => fetchGameBySlug(slug),
    enabled: !!slug && !settled,
    staleTime: 60_000,
  });
  if (settled) return { game: settled, isLoading: false, isError: false, refetch };
  const fallback = known.status === 'unsettled' ? known.fallback : undefined;
  return { game: data ?? fallback ?? null, isLoading, isError, refetch };
}
