'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { DeskTitle } from '@/components/dashboard/DeskTitle';
import { FormLine } from '@/components/dashboard/FormLine';
import { HistoryRow, OUTCOME_LOOKS } from '@/components/dashboard/HistoryRow';
import { FilterPill } from '@/components/lists/FilterPill';
import { Pager } from '@/components/lists/Pager';
import { SearchField } from '@/components/lists/SearchField';
import type { DuelGame } from '@/hooks/useDashboard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { NO_WINNER_REASONS, otherOf, outcomeOf, type MyDuel } from '@/lib/dashboard';
import {
  compactSearchText,
  filterHistory,
  HISTORY_FILTERS,
  HISTORY_PAGE_SIZE,
  historyCounts,
  historyPage,
  searchHistory,
  type HistoryFilter,
} from '@/lib/dashboardHistory';
import type { OwedItem } from '@/lib/owed';
import { cn, truncateAddress } from '@/lib/utils';

const FILTER_LABELS: Record<HistoryFilter, TranslationKey> = {
  all: 'dash.filter.all',
  won: 'dash.filter.won',
  lost: 'dash.filter.lost',
  none: 'dash.filter.none',
};

/**
 * How the rows come in: rising in turn as the page opens, rising again after a filter or a search,
 * and sliding in from the side another page lies on.
 */
type RowMotion = 'enter' | 'swap' | 'next' | 'prev';

const ROW_MOTIONS: Record<RowMotion, string> = {
  enter: 'animate-row-in [animation-delay:calc(var(--i)*45ms)]',
  swap: 'animate-row-swap [animation-delay:calc(var(--i)*22ms)]',
  next: 'animate-row-next [animation-delay:calc(var(--i)*18ms)]',
  prev: 'animate-row-prev [animation-delay:calc(var(--i)*18ms)]',
};

/** Rows past this one come in together with it, so a full page does not keep the last row waiting. */
const LAST_STAGGERED_ROW = 12;

interface HistoryProps {
  /** The finished duels, newest first. */
  past: readonly MyDuel[];
  gameOf: (duelId: number) => DuelGame | null;
  nameOf: (address: string) => string;
  /** What the contract still keeps for the reader, by duel. */
  owedById: ReadonlyMap<number, OwedItem>;
}

/**
 * The finished duels: the latest results as a form line, a search that ignores spaces, a filter by
 * result with how many each would show, and the rows a page of twenty at a time.
 */
export function History({ past, gameOf, nameOf, owedById }: HistoryProps) {
  const { t, language } = useTranslation();
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isSeen = useSeenOnce(listRef, 0.1);
  const [view, setView] = useState({ query: '', filter: 'all' as HistoryFilter, page: 1, motion: 'enter' as RowMotion, turn: 0 });

  const textOf = useMemo(() => {
    const texts = new Map<number, string>();
    for (const entry of past) {
      const other = otherOf(entry);
      const outcome = outcomeOf(entry);
      const reason = NO_WINNER_REASONS[entry.phase];
      const { id, message } = entry.duel;
      texts.set(
        id,
        compactSearchText(
          [
            gameOf(id)?.name,
            `#${id}`,
            id,
            other,
            other && truncateAddress(other),
            other && nameOf(other),
            message,
            t(OUTCOME_LOOKS[outcome].label),
            outcome === 'none' && reason ? t(reason, { other: other ? nameOf(other) : '' }) : null,
          ],
          language
        )
      );
    }
    return (entry: MyDuel) => texts.get(entry.duel.id) ?? '';
  }, [past, gameOf, nameOf, t, language]);

  const found = searchHistory(past, view.query, textOf, language);
  const counts = historyCounts(found);
  const shown = filterHistory(found, view.filter);
  const { rows, page } = historyPage(shown, view.page);
  const query = view.query.trim();

  function show(change: Partial<typeof view>, motion: RowMotion) {
    setView((current) => ({ ...current, page: 1, ...change, motion, turn: current.turn + 1 }));
  }

  function turnTo(next: number) {
    const section = sectionRef.current;
    if (section && section.getBoundingClientRect().top < 0) section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    show({ page: next }, next > page ? 'next' : 'prev');
  }

  function clearSearch() {
    show({ query: '' }, 'swap');
    searchRef.current?.focus();
  }

  const isWaiting = view.motion === 'enter' && !isSeen && !reducedMotion;
  const rowMotion = reducedMotion || isWaiting ? null : ROW_MOTIONS[view.motion];

  return (
    <section ref={sectionRef} id="history" aria-labelledby={titleId} className="scroll-mt-28">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 @max-[600px]/desk:items-start">
        <DeskTitle id={titleId} count={past.length} className="mb-0">
          {t('dashboard.history')}
        </DeskTitle>
        <FormLine past={past} gameOf={gameOf} />
      </div>
      <div className="mb-3.5 grid gap-3">
        <SearchField
          ref={searchRef}
          value={view.query}
          onChange={(query) => show({ query }, 'swap')}
          placeholder={t('dash.search.placeholder')}
        />
        <div role="group" aria-label={t('dash.filter.label')} className="flex flex-wrap gap-2">
          {HISTORY_FILTERS.map((filter) => (
            <FilterPill key={filter} isPressed={view.filter === filter} onClick={() => show({ filter }, 'swap')} count={counts[filter]}>
              {t(FILTER_LABELS[filter])}
            </FilterPill>
          ))}
        </div>
      </div>
      <div ref={listRef}>
        {rows.length === 0 ? (
          <div className="grid justify-items-start gap-1 rounded-3xl border border-dashed border-line-strong px-5 py-[22px] text-ink-2">
            <p>{query ? t('dash.history.none', { q: query }) : t('dash.history.noneFilter')}</p>
            {query && (
              <button type="button" onClick={clearSearch} className="link inline-flex min-h-11 cursor-pointer items-center">
                {t('lists.clearSearch')}
              </button>
            )}
          </div>
        ) : (
          <ol key={view.turn} className="rounded-3xl border border-line bg-paper p-1">
            {rows.map((entry, index) => (
              <li
                key={entry.duel.id}
                style={{ '--i': Math.min(index, LAST_STAGGERED_ROW) }}
                className={cn('not-first:before:mx-4 not-first:before:block not-first:before:h-px not-first:before:bg-line', isWaiting && 'opacity-0', rowMotion)}
              >
                <HistoryRow
                  entry={entry}
                  game={gameOf(entry.duel.id)}
                  nameOf={nameOf}
                  owed={owedById.get(entry.duel.id)}
                  isStamped={view.motion === 'enter' && rowMotion !== null}
                />
              </li>
            ))}
          </ol>
        )}
        <Pager page={page} total={shown.length} pageSize={HISTORY_PAGE_SIZE} onPage={turnTo} />
      </div>
    </section>
  );
}
