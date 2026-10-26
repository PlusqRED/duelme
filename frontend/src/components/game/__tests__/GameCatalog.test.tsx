// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { Game, GameCategory } from '@/lib/game';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const catalog = vi.hoisted(() => ({
  games: [] as Game[],
  isRead: true,
  askedFor: [] as [string | undefined, string | undefined][],
}));
vi.mock('@/hooks/useGames', () => ({
  useGames: (category?: string, search?: string) => {
    catalog.askedFor.push([category, search]);
    return { games: catalog.games, isLoading: !catalog.isRead, isRead: catalog.isRead };
  },
}));

const { GameCatalog } = await import('@/components/game/GameCatalog');

function game(slug: string, name: string, duelCount: number, category: GameCategory = 'MOBA'): Game {
  return { slug, name, iconUrl: null, category, duelCount, createdAt: null, updatedAt: null };
}

const guides = [
  { slug: 'cs2', name: 'CS2', category: 'FPS' as const },
  { slug: 'chess', name: 'Chess', category: 'BOARD' as const },
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
  catalog.isRead = true;
  catalog.askedFor = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GameCatalog', () => {
  it('shelves every guide’s game under its category before the catalog answers', () => {
    catalog.games = [];
    catalog.isRead = false;

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

  it('asks the catalog for the name typed, trimmed', () => {
    render(<GameCatalog guides={guides} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' dota ' } });

    expect(catalog.askedFor.at(-1)).toEqual([undefined, 'dota']);
  });

  it('gives no trophy while the page is narrowed', () => {
    render(<GameCatalog guides={guides} />);

    fireEvent.click(screen.getByRole('button', { name: `${en['category.OTHER']} 1` }));

    expect(screen.queryByText(en['games.mostPlayed'])).toBeNull();
  });

  it('says when no game has the name typed, and how to add it', () => {
    catalog.games = [];
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
