'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { DuelRow } from '@/components/feed/DuelRow';
import { FilterPill } from '@/components/lists/FilterPill';
import { Pager } from '@/components/lists/Pager';
import { SearchField } from '@/components/lists/SearchField';
import { Button } from '@/components/ui/button';
import { useClockValue } from '@/hooks/useNow';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { getContractConfig } from '@/lib/contractConfig';
import { countFeed, FEED_FILTERS, filterFeed, type FeedDuel, type FeedFilter } from '@/lib/duelFeed';
import { duelPhase, phaseLabel } from '@/lib/duelPhase';
import { buildFeedSearchText, normalizeSearchQuery } from '@/lib/duelSearch';
import { clampPage, pageOf } from '@/lib/pages';

/** Rows a page of the feed holds. */
export const FEED_PAGE_SIZE = 20;

const FILTER_LABEL_KEY: Record<FeedFilter, TranslationKey> = {
  all: 'feed.filter.all',
  live: 'feed.filter.live',
  won: 'feed.filter.won',
  refunded: 'feed.filter.refunded',
  calledOff: 'feed.filter.calledOff',
  disputed: 'feed.filter.disputed',
};

interface DuelFeedProps {
  duels: readonly FeedDuel[];
  isLoading: boolean;
  /** The search, held by the caller so the address can keep it. */
  query: string;
  onQueryChange: (query: string) => void;
  /** What stands in the list's place while no duel has been joined at all. */
  empty: ReactNode;
  /** What the caller narrowed the duels to, a game say: another one starts the list on its first page. */
  scope?: string;
}

/**
 * Duels someone joined, newest first, as the landing's rows: a search over what a row shows, the
 * states to keep with how many each holds, and pages of twenty. Each new set of rows rises into place.
 */
export function DuelFeed({ duels, isLoading, query, onQueryChange, empty, scope = '' }: DuelFeedProps) {
  const { t, language } = useTranslation();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [shownScope, setShownScope] = useState(scope);
  if (scope !== shownScope) {
    setShownScope(scope);
    setPage(1);
    setOpenId(null);
  }
  // The search reads each row's state the way its pill names it; a reported win running out of
  // time renames one, so the index is built again each minute rather than every second.
  const minute = useClockValue((now) => Math.floor(now / 60));

  const textById = useMemo(() => {
    const now = minute * 60;
    const claimTimeout = getContractConfig().claimTimeout;
    return new Map(
      duels.map((duel) => [
        duel.id,
        buildFeedSearchText(duel, t(phaseLabel(duel, duelPhase(duel, now, claimTimeout)).key), language),
      ])
    );
  }, [duels, t, language, minute]);
  const search = { normalizedQuery: normalizeSearchQuery(query, language), textById };
  const counts = countFeed(duels, search);
  const shown = filterFeed(duels, filter, search);
  const shownPage = clampPage(page, shown.length, FEED_PAGE_SIZE);
  const rows = pageOf(shown, shownPage, FEED_PAGE_SIZE);
  const isFiltered = filter !== 'all' || search.normalizedQuery !== '';

  function show(next: { filter?: FeedFilter; query?: string; page?: number }) {
    if (next.filter !== undefined) setFilter(next.filter);
    if (next.query !== undefined) onQueryChange(next.query);
    setPage(next.page ?? 1);
    setOpenId(null);
  }

  if (!isLoading && duels.length === 0) {
    return empty;
  }

  return (
    <div>
      <div className="mb-3.5 grid gap-3">
        <SearchField value={query} onChange={(value) => show({ query: value })} placeholder={t('feed.searchPlaceholder')} />
        <div role="group" aria-label={t('feed.filterLabel')} className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
          {FEED_FILTERS.map((option) => (
            <FilterPill key={option} isPressed={filter === option} onClick={() => show({ filter: option })} count={counts[option]}>
              {t(FILTER_LABEL_KEY[option])}
            </FilterPill>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ol aria-hidden="true" className="rounded-3xl border border-line bg-paper p-1">
          {[0, 1, 2].map((index) => (
            <li key={index} className="m-1 h-[88px] animate-pulse rounded-[20px] bg-canvas" />
          ))}
        </ol>
      ) : rows.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-3xl border-2 border-dashed border-line-strong p-[clamp(18px,2.4vw,26px)]">
          <p className="text-ink-2">{t(isFiltered ? 'feed.noMatches' : 'recent.noActivity')}</p>
          {isFiltered && (
            <Button variant="paper" size="sm" onClick={() => show({ filter: 'all', query: '' })}>
              {t('lists.clearFilters')}
            </Button>
          )}
        </div>
      ) : (
        <ol key={`${scope}|${filter}|${search.normalizedQuery}|${shownPage}`} className="rounded-3xl border border-line bg-paper p-1">
          {rows.map((duel, index) => (
            <DuelRow
              key={duel.id}
              duel={duel}
              index={index}
              isOpen={openId === duel.id}
              onToggle={() => setOpenId(openId === duel.id ? null : duel.id)}
              className="animate-rise [animation-delay:calc(min(var(--i),8)*45ms)]"
            />
          ))}
        </ol>
      )}

      <Pager page={shownPage} total={shown.length} pageSize={FEED_PAGE_SIZE} onPage={(next) => show({ page: next })} />
    </div>
  );
}
