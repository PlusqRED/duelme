import { DuelState } from '@/lib/contracts';
import type { SeatSide } from '@/lib/duel';
import type { DuelMeta, Game } from '@/lib/game';

/** How many open duels the landing shows; the count beside its title is all of them. */
export const OPEN_DUELS_SHOWN = 6;

/** How many finished duels the landing lists, of every game or of the one picked. */
export const RESULTS_SHOWN = 6;

/** How many games the landing offers to filter its finished duels by. */
export const POPULAR_GAMES_SHOWN = 6;

/** One open duel gets a wide card beside the invitation to create one; two or more are a lobby. */
export function isLobby(count: number): boolean {
  return count > 1;
}

/** A lobby on a wide screen: two across for two or four cards, so none is left alone, else three. */
export function lobbyColumns(count: number): 2 | 3 {
  return count === 2 || count === 4 ? 2 : 3;
}

/** A duel the landing lists as finished: one that ended with a winner paid. */
export function isWon(duel: { state: DuelState }): boolean {
  return duel.state === DuelState.Resolved;
}

/** Which seat won a finished duel: the creator's, or the one who joined. */
export function winnerSide(duel: { player1: string; winner: string }): SeatSide {
  return duel.winner.toLowerCase() === duel.player1.toLowerCase() ? 'creator' : 'opponent';
}

/** The first `limit` duels of one game, given that game's duels, or of every game when there is none. */
export function pickResults<T extends { id: number }>(
  duels: readonly T[],
  gameDuels: readonly DuelMeta[] | null,
  limit: number
): T[] {
  if (gameDuels === null) {
    return duels.slice(0, limit);
  }
  const inGame = new Set(gameDuels.map((meta) => meta.duelId));
  return duels.filter((duel) => inGame.has(duel.id)).slice(0, limit);
}

/** The games with the most duels, most first, as many as the landing shows; one nobody has played is not popular. */
export function popularGames(games: readonly Game[]): Game[] {
  return games
    .filter((game) => game.duelCount > 0)
    .sort((a, b) => b.duelCount - a.duelCount)
    .slice(0, POPULAR_GAMES_SHOWN);
}
