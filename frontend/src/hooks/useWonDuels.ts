'use client';

import { useMemo } from 'react';
import { useNicknames } from '@/hooks/useNicknames';
import { usePublicDuelMetas } from '@/hooks/usePublicDuelMetas';
import { useRecentDuels } from '@/hooks/useRecentDuels';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import type { SeatSide } from '@/lib/duel';
import type { DuelMeta } from '@/lib/game';
import { isWon, pickResults, RESULTS_LOOKED_UP, RESULTS_SHOWN, winnerSide } from '@/lib/landingDuels';

export interface WonDuel {
  id: number;
  creator: `0x${string}`;
  opponent: `0x${string}`;
  creatorName: string;
  opponentName: string;
  winner: SeatSide;
  /** Each player's stake, in USDT's base units; the winner took both. */
  stake: bigint;
  note: string;
  /** When it ended, in seconds. */
  endedAt: bigint;
  /** Unknown until the duel's metadata arrives, and for a duel created without a game. */
  game: DuelMeta | undefined;
}

/**
 * The latest duels that ended with a winner paid, newest first: of every game, or of the game
 * picked by its slug. `hasAny` tells a quiet arena from a game that has not been played yet.
 */
export function useWonDuels(gameSlug: string | null) {
  const { duels, isLoading, isError, retry } = useRecentDuels();
  const won = useMemo(() => duels.filter(isWon).slice(0, RESULTS_LOOKED_UP), [duels]);
  const wonIds = useMemo(() => won.map((duel) => duel.id), [won]);
  const { metaByDuelId } = usePublicDuelMetas(wonIds, DEFAULT_CHAIN_ID);

  const shown = useMemo(
    () => pickResults(won, metaByDuelId, gameSlug, RESULTS_SHOWN),
    [won, metaByDuelId, gameSlug]
  );
  const players = useMemo(() => shown.flatMap((duel) => [duel.player1, duel.player2]), [shown]);
  const { resolveDisplay } = useNicknames(players);

  const results = useMemo<WonDuel[]>(
    () =>
      shown.map((duel) => ({
        id: duel.id,
        creator: duel.player1,
        opponent: duel.player2,
        creatorName: resolveDisplay(duel.player1),
        opponentName: resolveDisplay(duel.player2),
        winner: winnerSide(duel),
        stake: duel.wagerAmount,
        note: duel.message,
        endedAt: duel.lastEventAt,
        game: metaByDuelId[duel.id],
      })),
    [shown, metaByDuelId, resolveDisplay]
  );

  return { results, hasAny: won.length > 0, isLoading, isError, retry };
}
