'use client';

import { useMemo } from 'react';
import { useDuelsByGame } from '@/hooks/useDuelsByGame';
import { useDuelsByIds } from '@/hooks/useDuelReads';
import type { ContractConfig } from '@/lib/contractConfig';
import { latestDuelIds, pickGameNote } from '@/lib/gameNote';

/**
 * A note players really made a duel of this game with, for the message field to show as its
 * example; null for a game without one, or before it is read. `gameSlug` undefined reads nothing: no
 * game yet, or one added on this page.
 */
export function useGameNote(gameSlug: string | undefined, chainId: number, limits: ContractConfig): string | null {
  const { duels: metas } = useDuelsByGame(gameSlug, chainId);
  const ids = useMemo(() => latestDuelIds(metas.map((meta) => meta.duelId)), [metas]);
  const { duels } = useDuelsByIds(ids, { chainId });
  // Only this game's duels: the read of the game picked before may still be the one in hand.
  return useMemo(
    () => (gameSlug ? pickGameNote(duels.filter((duel) => ids.includes(duel.id)), limits) : null),
    [gameSlug, ids, duels, limits]
  );
}
