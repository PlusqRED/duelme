import { describe, expect, it } from 'vitest';
import { DuelState } from '@/lib/contracts';
import { duelMeta } from '@/lib/__tests__/helpers/duelMeta';
import type { Game } from '@/lib/game';
import { isLobby, isWon, lobbyColumns, pickResults, popularGames, POPULAR_GAMES_SHOWN, winnerSide } from '@/lib/landingDuels';

const CREATOR = '0x1111111111111111111111111111111111111111';
const OPPONENT = '0x2222222222222222222222222222222222222222';

function game(slug: string, duelCount: number): Game {
  return { slug, name: slug, iconUrl: null, category: 'OTHER', duelCount, createdAt: null, updatedAt: null };
}

describe('isLobby', () => {
  it('gives no open duel and one open duel the wide layout', () => {
    expect([isLobby(0), isLobby(1)]).toEqual([false, false]);
  });

  it('makes two open duels a lobby', () => {
    expect(isLobby(2)).toBe(true);
  });
});

describe('lobbyColumns', () => {
  it('sets two and four cards two across, so none is left alone on a row', () => {
    expect([lobbyColumns(2), lobbyColumns(4)]).toEqual([2, 2]);
  });

  it('sets three, five and six cards three across', () => {
    expect([lobbyColumns(3), lobbyColumns(5), lobbyColumns(6)]).toEqual([3, 3, 3]);
  });
});

describe('isWon', () => {
  it('lists a duel that ended with a winner paid', () => {
    expect(isWon({ state: DuelState.Resolved })).toBe(true);
  });

  it('leaves out every other end and every duel still being played', () => {
    const others = [
      DuelState.Funded,
      DuelState.WinnerClaimed,
      DuelState.Refunded,
      DuelState.Cancelled,
      DuelState.Declined,
      DuelState.Disputed,
      DuelState.MutualCancelRequested,
      DuelState.MutuallyCancelled,
    ];

    expect(others.filter((state) => isWon({ state }))).toEqual([]);
  });
});

describe('winnerSide', () => {
  it('names the creator’s seat when the creator won, whatever the address’s case', () => {
    expect(winnerSide({ player1: CREATOR, winner: CREATOR.toUpperCase().replace('0X', '0x') })).toBe('creator');
  });

  it('names the opponent’s seat when the one who joined won', () => {
    expect(winnerSide({ player1: CREATOR, winner: OPPONENT })).toBe('opponent');
  });
});

describe('pickResults', () => {
  const duels = [{ id: 5 }, { id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }];

  it('keeps the newest duels of every game when no game is picked', () => {
    expect(pickResults(duels, null, 3).map((duel) => duel.id)).toEqual([5, 4, 3]);
  });

  it('keeps only the picked game’s duels, newest first, up to the limit', () => {
    const chess = [duelMeta(1, 'chess'), duelMeta(5, 'chess'), duelMeta(2, 'chess')];

    expect(pickResults(duels, chess, 2).map((duel) => duel.id)).toEqual([5, 2]);
  });

  it('finds nothing for a game none of the duels was played in', () => {
    expect(pickResults(duels, [], 6)).toEqual([]);
  });

  it('leaves out a duel of the game that is not among the duels given', () => {
    expect(pickResults(duels, [duelMeta(9, 'chess')], 6)).toEqual([]);
  });
});

describe('popularGames', () => {
  it('puts the games with the most duels first', () => {
    const games = [game('chess', 1), game('dota-2', 3), game('cs-2', 2)];

    expect(popularGames(games).map((each) => each.slug)).toEqual(['dota-2', 'cs-2', 'chess']);
  });

  it('leaves out a game nobody has played yet', () => {
    expect(popularGames([game('chess', 0), game('cs-2', 1)]).map((each) => each.slug)).toEqual(['cs-2']);
  });

  it('keeps as many as the landing shows', () => {
    const games = Array.from({ length: POPULAR_GAMES_SHOWN + 2 }, (_, index) => game(`game-${index}`, index + 1));

    expect(popularGames(games)).toHaveLength(POPULAR_GAMES_SHOWN);
  });

  it('leaves the list it was given as it was', () => {
    const games = [game('chess', 1), game('dota-2', 3)];

    popularGames(games);

    expect(games.map((each) => each.slug)).toEqual(['chess', 'dota-2']);
  });
});
