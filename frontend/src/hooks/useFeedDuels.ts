'use client';

import { useMemo } from 'react';
import { useNicknames } from '@/hooks/useNicknames';
import { toFeedDuel, type FeedDuel, type RecentDuel } from '@/lib/duelFeed';
import type { DuelMeta } from '@/lib/game';

/** A feed's duels with their players named and their games, from the metadata the caller read. */
export function useFeedDuels(duels: readonly RecentDuel[], metaByDuelId: Readonly<Record<number, DuelMeta>>): FeedDuel[] {
  const players = useMemo(() => duels.flatMap((duel) => [duel.player1, duel.player2]), [duels]);
  const { resolveDisplay } = useNicknames(players);

  return useMemo(
    () => duels.map((duel) => toFeedDuel(duel, resolveDisplay, metaByDuelId[duel.id])),
    [duels, resolveDisplay, metaByDuelId]
  );
}
