import { useQuery } from '@tanstack/react-query';
import { fetchGameBySlug } from '@/lib/gameApi';
import type { Game } from '@/lib/game';

/** One game of the catalog by its slug: null when the catalog has no such game, which a failed read is not. */
export function useGame(slug: string) {
  const { data, isLoading, isError, refetch } = useQuery<Game | null>({
    queryKey: ['game', slug],
    queryFn: () => fetchGameBySlug(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });
  return { game: data ?? null, isLoading, isError, refetch };
}
