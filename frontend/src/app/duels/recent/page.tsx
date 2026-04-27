'use client';

import { useCallback, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecentDuelsFilters } from '@/components/duel/recent/RecentDuelsFilters';
import { RecentDuelsGrid } from '@/components/duel/recent/RecentDuelsGrid';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useNicknames } from '@/hooks/useNicknames';
import { usePublicDuelMetas } from '@/hooks/usePublicDuelMetas';
import { useRecentDuels } from '@/hooks/useRecentDuels';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { buildRecentDuelSearchText } from '@/lib/duelSearch';
import {
  RECENT_STATE_FILTERS,
  applyRecentFilters,
  isStateInFilter,
  type RecentSortBy,
  type RecentStateFilter,
} from '@/lib/recentDuelsFilters';

const INITIAL_VISIBLE = 12;
const BATCH_SIZE = 12;

export default function RecentDuelsPage() {
  const { t, language } = useTranslation();
  const { duels, isLoading } = useRecentDuels();

  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<RecentStateFilter>('all');
  const [sort, setSort] = useState<RecentSortBy>('newest');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setVisibleCount(INITIAL_VISIBLE);
  }, []);

  const handleStateFilterChange = useCallback((next: RecentStateFilter) => {
    setStateFilter(next);
    setVisibleCount(INITIAL_VISIBLE);
  }, []);

  const handleSortChange = useCallback((next: RecentSortBy) => {
    setSort(next);
    setVisibleCount(INITIAL_VISIBLE);
  }, []);

  const duelIds = useMemo(() => duels.map((d) => d.id), [duels]);
  const addresses = useMemo(
    () => duels.flatMap((d) => [d.player1, d.player2]),
    [duels],
  );

  const { metaByDuelId } = usePublicDuelMetas(duelIds, DEFAULT_CHAIN_ID);
  const { reputationByAddress } = useReputationLevels(addresses, DEFAULT_CHAIN_ID);
  const { resolveDisplay, nicknameByAddress } = useNicknames(addresses);

  const searchIndexByDuelId = useMemo(() => {
    const map: Record<number, string> = {};
    for (const duel of duels) {
      map[duel.id] = buildRecentDuelSearchText(
        duel,
        t,
        language,
        reputationByAddress,
        nicknameByAddress,
        metaByDuelId[duel.id]?.gameName,
      );
    }
    return map;
  }, [duels, t, language, reputationByAddress, nicknameByAddress, metaByDuelId]);

  const buildSearchIndex = useCallback(
    (duel: (typeof duels)[number]) => searchIndexByDuelId[duel.id] ?? '',
    [searchIndexByDuelId],
  );

  const filteredDuels = useMemo(
    () =>
      applyRecentFilters(duels, {
        stateFilter,
        sort,
        searchQuery,
        buildSearchIndex,
      }),
    [duels, stateFilter, sort, searchQuery, buildSearchIndex],
  );

  const countByFilter = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const counts = Object.fromEntries(
      RECENT_STATE_FILTERS.map((f) => [f, 0]),
    ) as Record<RecentStateFilter, number>;

    for (const duel of duels) {
      if (normalizedQuery && !searchIndexByDuelId[duel.id].includes(normalizedQuery)) {
        continue;
      }
      for (const filter of RECENT_STATE_FILTERS) {
        if (isStateInFilter(duel.state, filter)) {
          counts[filter] += 1;
        }
      }
    }

    return counts;
  }, [duels, searchQuery, searchIndexByDuelId]);

  const visibleDuels = useMemo(
    () => filteredDuels.slice(0, visibleCount),
    [filteredDuels, visibleCount],
  );

  const hasMore = visibleCount < filteredDuels.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredDuels.length));
  }, [filteredDuels.length]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    onLoadMore: handleLoadMore,
  });

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStateFilter('all');
    setSort('newest');
    setVisibleCount(INITIAL_VISIBLE);
  }, []);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || stateFilter !== 'all' || sort !== 'newest';
  const filteredEmpty = !isLoading && duels.length > 0 && filteredDuels.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('recent.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          {t('recent.dedicatedSubtitle')}
        </p>
      </div>

      {duels.length > 0 && (
        <div className="mb-6 sm:sticky sm:top-14 sm:z-30 sm:-mx-4 sm:bg-slate-50/80 sm:px-4 sm:py-4 sm:backdrop-blur-md">
          <RecentDuelsFilters
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            stateFilter={stateFilter}
            onStateFilterChange={handleStateFilterChange}
            sort={sort}
            onSortChange={handleSortChange}
            countByFilter={countByFilter}
          />

          <p className="mt-3 text-xs text-slate-500">
            {hasActiveFilters
              ? t('recent.filteredCount', { count: filteredDuels.length, total: duels.length })
              : t('recent.count', { count: duels.length })}
          </p>
        </div>
      )}

      {filteredEmpty ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <Globe className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t('recent.noMatches')}</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              {t('dashboard.clearSearch')}
            </Button>
          )}
        </div>
      ) : (
        <RecentDuelsGrid
          duels={visibleDuels}
          isLoading={isLoading}
          metaByDuelId={metaByDuelId}
          resolveDisplay={resolveDisplay}
          nicknameByAddress={nicknameByAddress}
        />
      )}

      {filteredDuels.length > 0 && hasMore && (
        <div
          ref={sentinelRef}
          className="mt-8 flex items-center justify-center py-6 text-xs text-slate-400"
          aria-hidden="true"
        >
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          {t('recent.loadingMore')}
        </div>
      )}

      {filteredDuels.length > 0 && !hasMore && visibleDuels.length > INITIAL_VISIBLE && (
        <p className="mt-8 py-6 text-center text-xs text-slate-400">
          {t('recent.endOfList')}
        </p>
      )}
    </div>
  );
}
