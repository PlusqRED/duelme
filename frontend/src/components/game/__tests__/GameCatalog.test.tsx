// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { uncataloguedGame, type Game, type GameCategory } from '@/lib/game';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const catalog = vi.hoisted(() => ({ games: [] as Game[] }));
vi.mock('@/hooks/useGameCatalog', () => ({ useGameCatalog: () => ({ games: catalog.games, isLoading: false }) }));

const { GameCatalog } = await import('@/components/game/GameCatalog');

function game(slug: string, name: string, duelCount: number, category: GameCategory = 'MOBA'): Game {
  return { slug, name, iconUrl: null, category, duelCount, createdAt: null, updatedAt: null };
}

const guides = [
  uncataloguedGame({ slug: 'cs2', name: 'CS2', category: 'FPS' }),
  uncataloguedGame({ slug: 'chess', name: 'Chess', category: 'BOARD' }),
];

const en = translations.en;

const shelfTitles = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

function shelf(title: string): string[] {
  return within(screen.getByRole('list', { name: title }))
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '');
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  FakeIntersectionObserver.instances = [];
  catalog.games = [
    game('chess', 'Chess', 1, 'BOARD'),
    game('wow-midnight', 'Wow Midnight', 3, 'OTHER'),
    game('cs-2', 'CS 2', 1, 'FPS'),
    game('cs2', 'CS2', 2, 'FPS'),
  ];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GameCatalog', () => {
  it('shelves every guide’s game under its category before the catalog answers', () => {
    catalog.games = [];

    render(<GameCatalog guides={guides} />);

    expect(shelfTitles()).toEqual([en['category.shelf.FPS'], en['category.shelf.BOARD']]);
    expect(shelf(en['category.shelf.BOARD'])).toEqual(['/games/chess']);
  });

  it('puts the catalog’s games on their shelves in the categories’ order, the most played first', () => {
    render(<GameCatalog guides={guides} />);

    expect(shelfTitles()).toEqual([en['category.shelf.FPS'], en['category.shelf.BOARD'], en['category.shelf.OTHER']]);
    expect(shelf(en['category.shelf.FPS'])).toEqual(['/games/cs2', '/games/cs-2']);
  });

  it('counts each category’s games on its pill', () => {
    render(<GameCatalog guides={guides} />);

    expect(screen.getByRole('button', { name: `${en['category.FPS']} 2` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `${en['games.allCategories']} 4` })).toBeTruthy();
  });

  it('marks the most played game of all with the trophy', () => {
    render(<GameCatalog guides={guides} />);

    expect(within(screen.getByRole('list', { name: en['category.shelf.OTHER'] })).getByRole('link').textContent).toContain(
      en['games.mostPlayed']
    );
  });

  it('shows only the shelf of the category picked', () => {
    render(<GameCatalog guides={guides} />);

    fireEvent.click(screen.getByRole('button', { name: `${en['category.BOARD']} 1` }));

    expect(shelfTitles()).toEqual([en['category.shelf.BOARD']]);
  });

  it('finds a game by the name typed, however it is spelled', () => {
    render(<GameCatalog guides={guides} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' cs 2 ' } });

    expect(shelfTitles()).toEqual([en['category.shelf.FPS']]);
    expect(shelf(en['category.shelf.FPS'])).toEqual(['/games/cs2', '/games/cs-2']);
  });

  it('gives no trophy while the page is narrowed', () => {
    render(<GameCatalog guides={guides} />);

    fireEvent.click(screen.getByRole('button', { name: `${en['category.OTHER']} 1` }));

    expect(screen.queryByText(en['games.mostPlayed'])).toBeNull();
  });

  it('says when no game has the name typed, and how to add it', () => {
    render(<GameCatalog guides={guides} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zork' } });

    expect(screen.getByText(en['games.noMatches'])).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create a duel' }).getAttribute('href')).toBe('/duel/create');
  });

  it('grows a shelf’s bars the first time the shelf is seen', () => {
    render(<GameCatalog guides={guides} />);
    const list = screen.getByRole('list', { name: en['category.shelf.FPS'] });
    expect(list.hasAttribute('data-pending')).toBe(true);

    act(() => FakeIntersectionObserver.watching(list).report(list, true));

    expect(list.hasAttribute('data-pending')).toBe(false);
  });
});
