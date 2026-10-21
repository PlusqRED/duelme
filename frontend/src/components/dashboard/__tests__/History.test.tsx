// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DuelGame } from '@/hooks/useDashboard';
import { DuelState } from '@/lib/contracts';
import type { MyDuel } from '@/lib/dashboard';
import { DASH_NOW, myDuel, READER, RIVAL } from '@/lib/__tests__/helpers/myDuel';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { History } = await import('@/components/dashboard/History');

const GAMES: Record<number, DuelGame> = {
  1: { name: 'CS2', category: 'FPS' },
  2: { name: 'Dota 2', category: 'MOBA' },
  3: { name: 'Chess', category: 'STRATEGY' },
};

function won(id: number): MyDuel {
  return myDuel(id, { state: DuelState.Resolved, claimedWinner: READER });
}

function lost(id: number): MyDuel {
  return myDuel(id, { state: DuelState.Resolved, claimedWinner: RIVAL });
}

function renderHistory(past: MyDuel[]) {
  render(<History past={past} gameOf={(id) => GAMES[id] ?? null} nameOf={(address) => address} owedById={new Map()} />);
}

function rows() {
  return screen.queryAllByRole('listitem').filter((item) => item.querySelector('a')).map((item) => item.querySelector('a')?.getAttribute('href'));
}

function search(query: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Game, number, address or message' }), { target: { value: query } });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DASH_NOW * 1000);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('History', () => {
  it('lists the finished duels, the newest first, under their count', () => {
    renderHistory([lost(3), won(2), won(1)]);

    expect(screen.getByRole('heading', { name: 'History 3' })).toBeTruthy();
    expect(rows()).toEqual(['/duel/3', '/duel/2', '/duel/1']);
  });

  it('shows the latest results as a form line', () => {
    renderHistory([lost(3), won(2)]);

    expect(screen.getByRole('img', { name: 'Latest results, newest first: Lost, Won' })).toBeTruthy();
  });

  it('finds a duel by its game however the query is spaced', () => {
    renderHistory([lost(3), won(2), won(1)]);

    search('cs 2');

    expect(rows()).toEqual(['/duel/1']);
  });

  it('finds a duel by its number', () => {
    renderHistory([lost(3), won(2), won(1)]);

    search('# 2');

    expect(rows()).toEqual(['/duel/2']);
  });

  it('finds a duel by the opponent\'s address typed in parts', () => {
    renderHistory([won(2), myDuel(5, { state: DuelState.Cancelled, opponent: '0x0000000000000000000000000000000000000000' })]);

    search('0x32A3 0000');

    expect(rows()).toEqual(['/duel/2']);
  });

  it('counts what each filter would show, for the search typed', () => {
    renderHistory([lost(3), won(2), won(1)]);

    search('dota');

    const filters = within(screen.getByRole('group', { name: 'Show' })).getAllByRole('button');
    expect(filters.map((button) => button.textContent)).toEqual(['All1', 'Won1', 'Lost0', 'No winner0']);
  });

  it('shows only the duels that ended the way picked', () => {
    renderHistory([lost(3), won(2), won(1)]);

    fireEvent.click(screen.getByRole('button', { name: 'Lost 1' }));

    expect(rows()).toEqual(['/duel/3']);
    expect(screen.getByRole('button', { name: 'Lost 1' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('says nothing matched a search and clears it', () => {
    renderHistory([won(1)]);
    search('zzz');

    expect(screen.getByText('No duel matches “zzz”.')).toBeTruthy();
    // The field's own cross clears it too; this is the one under the empty list.
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear the search' }).at(-1)!);

    expect(rows()).toEqual(['/duel/1']);
  });

  it('says there is no duel like the filter picked', () => {
    renderHistory([won(1)]);

    fireEvent.click(screen.getByRole('button', { name: 'Lost 0' }));

    expect(screen.getByText('No duels like this yet.')).toBeTruthy();
  });

  it('shows twenty rows a page and no pages for fewer', () => {
    renderHistory(Array.from({ length: 20 }, (_, index) => won(20 - index)));

    expect(rows()).toHaveLength(20);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('turns to the next page', () => {
    renderHistory(Array.from({ length: 45 }, (_, index) => won(45 - index)));

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(rows()[0]).toBe('/duel/25');
    expect(screen.getByText('21–40 of 45')).toBeTruthy();
  });

  it('starts from the first page after a search', () => {
    renderHistory(Array.from({ length: 45 }, (_, index) => won(45 - index)));
    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));

    search('#4');

    expect(rows()).toEqual(['/duel/45', '/duel/44', '/duel/43', '/duel/42', '/duel/41', '/duel/40', '/duel/4']);
  });
});
