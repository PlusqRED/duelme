import { useQuery } from '@tanstack/react-query';
import { fetchGameBySlug } from '@/lib/gameApi';
import type { Game } from '@/lib/game';

export function useGame(slug: string) {
  const { data, isLoading } = useQuery<Game | null>({
    queryKey: ['game', slug],
    queryFn: () => fetchGameBySlug(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });
  return { game: data ?? null, isLoading };
}
