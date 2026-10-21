// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { Game, GameCategory } from '@/lib/game';
import { FakeIntersectionObserver } from '@/lib/__tests__/helpers/intersectionObserver';

const catalog = vi.hoisted(() => ({
  games: [] as Game[],
  isLoading: false,
  askedFor: [] as [string | undefined, string | undefined][],
}));
vi.mock('@/hooks/useGames', () => ({
  useGames: (category?: string, search?: string) => {
    catalog.askedFor.push([category, search]);
    return { games: catalog.games, isLoading: catalog.isLoading };
  },
}));

const { GameCatalog } = await import('@/components/game/GameCatalog');

function game(slug: string, name: string, duelCount: number, category: GameCategory = 'MOBA'): Game {
  return { slug, name, iconUrl: null, category, duelCount, createdAt: null, updatedAt: null };
}

const shelf = () => screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/games/'));

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  FakeIntersectionObserver.instances = [];
  catalog.games = [game('chess', 'Chess', 1, 'STRATEGY'), game('wow', 'Wow Midnight', 3, 'OTHER'), game('cs-2', 'CS 2', 1, 'FPS')];
  catalog.isLoading = false;
  catalog.askedFor = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GameCatalog', () => {
  it('shelves the most played game first, games played as often by name', () => {
    render(<GameCatalog />);

    expect(shelf().map((link) => link.getAttribute('href'))).toEqual(['/games/wow', '/games/chess', '/games/cs-2']);
  });

  it('marks the most played game with the trophy', () => {
    render(<GameCatalog />);

    expect(shelf()[0].textContent).toContain(translations.en['games.mostPlayed']);
  });

  it('asks the catalog for the category picked', () => {
    render(<GameCatalog />);

    fireEvent.click(screen.getByRole('button', { name: 'Strategy' }));

    expect(catalog.askedFor.at(-1)).toEqual(['STRATEGY', undefined]);
  });

  it('asks the catalog for the name typed, trimmed', () => {
    render(<GameCatalog />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' dota ' } });

    expect(catalog.askedFor.at(-1)).toEqual([undefined, 'dota']);
  });

  it('gives no trophy while the shelf is narrowed', () => {
    render(<GameCatalog />);

    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    expect(screen.queryByText(translations.en['games.mostPlayed'])).toBeNull();
  });

  it('says when no game has the name typed, and how to add it', () => {
    catalog.games = [];
    render(<GameCatalog />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zork' } });

    expect(screen.getByText(translations.en['games.noMatches'])).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create a duel' }).getAttribute('href')).toBe('/duel/create');
  });

  it('grows the bars the first time the shelf is seen', () => {
    render(<GameCatalog />);
    const list = screen.getByRole('list', { name: translations.en['games.title'] });
    expect(list.hasAttribute('data-pending')).toBe(true);

    act(() => FakeIntersectionObserver.watching(list).report(list, true));

    expect(list.hasAttribute('data-pending')).toBe(false);
  });
});
