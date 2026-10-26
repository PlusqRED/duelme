import { describe, expect, it } from 'vitest';
import { uncataloguedGame, type Game, type GameCategory } from '@/lib/game';
import { catalogGames, mostPlayed, shelvesOf } from '@/lib/gameShelves';

function game(slug: string, name: string, duelCount: number, category: GameCategory): Game {
  return { slug, name, iconUrl: null, category, duelCount, createdAt: null, updatedAt: null };
}

const guides = [
  { slug: 'cs2', name: 'CS2', category: 'FPS' as const },
  { slug: 'chess', name: 'Chess', category: 'BOARD' as const },
];

describe('catalogGames', () => {
  it('shows the guides’ games before the catalog answers', () => {
    expect(catalogGames(undefined, guides, '')).toEqual(guides.map(uncataloguedGame));
  });

  it('narrows the guides’ games by the search, however it is spelled, before the catalog answers', () => {
    expect(catalogGames(undefined, guides, ' cs 2 ').map(({ slug }) => slug)).toEqual(['cs2']);
  });

  it('adds a guide’s game the catalog lacks as one nobody has played', () => {
    const read = [game('cs2', 'CS2', 4, 'FPS'), game('wow-midnight', 'Wow Midnight', 1, 'OTHER')];

    expect(catalogGames(read, guides, '')).toEqual([...read, uncataloguedGame(guides[1])]);
  });

  it('takes the catalog’s word on a search, which a guide left out did not match', () => {
    const read = [game('cs2', 'CS2', 4, 'FPS')];

    expect(catalogGames(read, guides, 'cs')).toEqual(read);
  });
});

describe('shelvesOf', () => {
  it('shelves the games by category in the categories’ order, each played most first, empty ones left out', () => {
    const games = [
      game('chess', 'Chess', 1, 'BOARD'),
      game('valorant', 'Valorant', 0, 'FPS'),
      game('cs2', 'CS2', 3, 'FPS'),
      game('backgammon', 'Backgammon', 1, 'BOARD'),
    ];

    expect(shelvesOf(games).map(({ category, games: shelf }) => [category, shelf.map(({ slug }) => slug)])).toEqual([
      ['FPS', ['cs2', 'valorant']],
      ['BOARD', ['backgammon', 'chess']],
    ]);
  });
});

describe('mostPlayed', () => {
  it('finds the game with the most duels', () => {
    expect(mostPlayed([game('chess', 'Chess', 1, 'BOARD'), game('cs2', 'CS2', 3, 'FPS')])?.slug).toBe('cs2');
  });

  it('finds none before anyone has played', () => {
    expect(mostPlayed([game('chess', 'Chess', 0, 'BOARD')])).toBeNull();
  });
});
