'use client';

import { useCallback, useMemo } from 'react';
import { useDuelsByGame } from '@/hooks/useDuelsByGame';
import { useNicknames } from '@/hooks/useNicknames';
import { useDuelMetas } from '@/hooks/useDuelMetas';
import { useRecentDuels } from '@/hooks/useRecentDuels';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import type { SeatSide } from '@/lib/duel';
import type { DuelMeta } from '@/lib/game';
import { isWon, pickResults, RESULTS_SHOWN, winnerSide } from '@/lib/landingDuels';

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

const NO_IDS: number[] = [];

function byDuelId(metas: readonly DuelMeta[]): Record<number, DuelMeta> {
  return Object.fromEntries(metas.map((meta) => [meta.duelId, meta]));
}

/**
 * The latest duels that ended with a winner paid, newest first: of every game, or of the game the
 * list holds, by its slug, found among that game's own duels rather than by looking up the game of
 * every finished one. `upcoming` is a game just picked, not held yet: its duels start loading at the
 * click. `hasAny` tells a quiet arena from a game that has not been played to the end yet.
 */
export function useWonDuels(gameSlug: string | null, upcoming: string | null = gameSlug) {
  const { duels, isLoading, isError, retry: retryDuels } = useRecentDuels();
  const won = useMemo(() => duels.filter(isWon), [duels]);
  const game = useDuelsByGame(gameSlug ?? undefined, DEFAULT_CHAIN_ID);
  useDuelsByGame(upcoming ?? undefined, DEFAULT_CHAIN_ID);
  const isGameHeld = gameSlug !== null;
  const gameDuels = isGameHeld ? game.duels : null;

  const shown = useMemo(() => pickResults(won, gameDuels, RESULTS_SHOWN), [won, gameDuels]);
  const shownIds = useMemo(() => shown.map((duel) => duel.id), [shown]);
  // A picked game's duels come with their metadata; every game's are looked up, the few shown only.
  const { metaByDuelId } = useDuelMetas(gameDuels === null ? shownIds : NO_IDS, DEFAULT_CHAIN_ID);
  const gameMetas = useMemo(() => byDuelId(gameDuels ?? []), [gameDuels]);
  const metas = gameDuels === null ? metaByDuelId : gameMetas;
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
        game: metas[duel.id],
      })),
    [shown, metas, resolveDisplay]
  );

  const refetchGame = game.refetch;
  // Joins a read already running, so pressing Try again twice does not start it over.
  const retry = useCallback(async () => {
    await Promise.all([retryDuels(), isGameHeld && refetchGame({ cancelRefetch: false })]);
  }, [retryDuels, refetchGame, isGameHeld]);

  return {
    results,
    hasAny: won.length > 0,
    isLoading: isLoading || (isGameHeld && game.isLoading),
    isError: isError || (isGameHeld && game.isError),
    retry,
  };
}
