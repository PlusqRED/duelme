import type { Language } from '@/i18n/translations';
import { outcomeOf, type MyDuel, type Outcome } from '@/lib/dashboard';
import { normalizeSearchQuery } from '@/lib/duelSearch';

/** Which finished duels the history shows: all of them, or those that ended one way. */
export type HistoryFilter = 'all' | Outcome;

export const HISTORY_FILTERS: readonly HistoryFilter[] = ['all', 'won', 'lost', 'none'];

/** Rows on one page of the history, as many as the app has always shown. */
export const HISTORY_PAGE_SIZE = 20;

/** How many of the latest results the form line shows. */
export const FORM_SIZE = 10;

/**
 * Text folded the way the search box folds a query, with no spaces left at all, so `cs 2` finds
 * CS2, `# 12` finds #12 and `0x32a3 aa23` finds an address however it was typed.
 */
export function compactSearchText(parts: readonly (string | number | null | undefined)[], language: Language): string {
  return normalizeSearchQuery(parts.filter((part) => part !== null && part !== undefined).join(' '), language).replace(/ /g, '');
}

/** The entries whose text, from `textOf` and already compacted, holds the query typed in any spacing. */
export function searchHistory<T>(entries: readonly T[], query: string, textOf: (entry: T) => string, language: Language): readonly T[] {
  const needle = compactSearchText([query], language);
  return needle ? entries.filter((entry) => textOf(entry).includes(needle)) : entries;
}

/** How many duels each filter would show. */
export function historyCounts(entries: readonly MyDuel[]): Record<HistoryFilter, number> {
  const counts: Record<HistoryFilter, number> = { all: entries.length, won: 0, lost: 0, none: 0 };
  for (const entry of entries) counts[outcomeOf(entry)] += 1;
  return counts;
}

export function filterHistory(entries: readonly MyDuel[], filter: HistoryFilter): readonly MyDuel[] {
  return filter === 'all' ? entries : entries.filter((entry) => outcomeOf(entry) === filter);
}

export interface HistoryPage<T> {
  rows: T[];
  /** The page shown, from 1: the one asked for, or the last there is. */
  page: number;
  pages: number;
  /** The index of the first row shown. */
  from: number;
}

/** One page of `rows`; a page past the end shows the last one, so a narrower search never lands on nothing. */
export function historyPage<T>(rows: readonly T[], page: number, size = HISTORY_PAGE_SIZE): HistoryPage<T> {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const shown = Math.min(Math.max(1, page), pages);
  const from = (shown - 1) * size;
  return { rows: rows.slice(from, from + size), page: shown, pages, from };
}
