import { describe, expect, it } from 'vitest';
import { DuelState } from '@/lib/contracts';
import type { MyDuel } from '@/lib/dashboard';
import { compactSearchText, filterHistory, historyCounts, historyPage, searchHistory } from '@/lib/dashboardHistory';
import { duelView } from './helpers/duelView';

const ME: `0x${string}` = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const THEM: `0x${string}` = '0x32a3000000000000000000000000000000aa23';

function finished(id: number, phase: MyDuel['phase'], claimedWinner = ME): MyDuel {
  const state = phase === 'resolved' ? DuelState.Resolved : DuelState.Refunded;
  return { duel: { ...duelView({ creator: ME, opponent: THEM, state, claimedWinner }), id }, phase, seat: 'creator' };
}

describe('compactSearchText', () => {
  it('folds the parts and drops every space', () => {
    expect(compactSearchText(['CS 2', '#12', 12], 'en')).toBe('cs2#1212');
  });

  it('skips the parts that are missing', () => {
    expect(compactSearchText(['Chess', null, undefined], 'en')).toBe('chess');
  });

  it('folds ё the way a Russian query is folded', () => {
    expect(compactSearchText(['Ещё'], 'ru')).toBe('еще');
  });
});

describe('searchHistory', () => {
  const rows = ['cs2#12', 'dota2#3', '0x32a3000000000000000000000000000000aa23'];
  const textOf = (row: string) => row;

  it('finds a row however the query is spaced', () => {
    expect(searchHistory(rows, ' cs 2 ', textOf, 'en')).toEqual(['cs2#12']);
  });

  it('finds an address typed in groups', () => {
    expect(searchHistory(rows, '0x32A3 0000', textOf, 'en')).toEqual(['0x32a3000000000000000000000000000000aa23']);
  });

  it('keeps every row for an empty query', () => {
    expect(searchHistory(rows, '   ', textOf, 'en')).toBe(rows);
  });
});

describe('historyCounts', () => {
  it('counts the rows each filter would show', () => {
    const entries = [finished(1, 'resolved'), finished(2, 'resolved', THEM), finished(3, 'resolved', THEM), finished(4, 'refunded')];

    expect(historyCounts(entries)).toEqual({ all: 4, won: 1, lost: 2, none: 1 });
  });
});

describe('filterHistory', () => {
  it('keeps the duels that ended the way picked', () => {
    const entries = [finished(1, 'resolved'), finished(2, 'resolved', THEM), finished(3, 'refunded')];

    expect(filterHistory(entries, 'lost').map((entry) => entry.duel.id)).toEqual([2]);
  });

  it('keeps every duel for all', () => {
    const entries = [finished(1, 'resolved'), finished(2, 'refunded')];

    expect(filterHistory(entries, 'all')).toBe(entries);
  });
});

describe('historyPage', () => {
  const rows = Array.from({ length: 45 }, (_, index) => index);

  it('cuts the page asked for', () => {
    expect(historyPage(rows, 2)).toEqual({ rows: rows.slice(20, 40), page: 2, pages: 3, from: 20 });
  });

  it('shows the last page for one past the end', () => {
    expect(historyPage(rows, 9)).toMatchObject({ page: 3, from: 40, rows: rows.slice(40) });
  });

  it('has one empty page for no rows', () => {
    expect(historyPage([], 1)).toEqual({ rows: [], page: 1, pages: 1, from: 0 });
  });

  it('shows the first page for a page below one', () => {
    expect(historyPage(rows, 0).page).toBe(1);
  });
});
