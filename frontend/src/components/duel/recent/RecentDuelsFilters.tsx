'use client';

import { ArrowUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import {
  RECENT_SORT_OPTIONS,
  type RecentSortBy,
  type RecentStateFilter,
} from '@/lib/recentDuelsFilters';
import { StateFilterChips } from './StateFilterChips';

const SORT_LABEL_KEY: Record<RecentSortBy, TranslationKey> = {
  newest: 'recent.sort.newest',
  oldest: 'recent.sort.oldest',
  highestWager: 'recent.sort.highestWager',
  lowestWager: 'recent.sort.lowestWager',
};

interface RecentDuelsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  stateFilter: RecentStateFilter;
  onStateFilterChange: (next: RecentStateFilter) => void;
  sort: RecentSortBy;
  onSortChange: (next: RecentSortBy) => void;
  countByFilter: Record<RecentStateFilter, number>;
}

export function RecentDuelsFilters({
  searchQuery,
  onSearchChange,
  stateFilter,
  onStateFilterChange,
  sort,
  onSortChange,
  countByFilter,
}: RecentDuelsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('recent.searchPlaceholder')}
            className="h-11 border-slate-200 bg-white pl-10"
            aria-label={t('recent.searchPlaceholder')}
          />
        </div>

        <label className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('recent.sort.label')}
          </span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as RecentSortBy)}
            className="cursor-pointer bg-transparent pr-1 text-sm font-medium text-slate-700 outline-none focus:text-indigo-700"
          >
            {RECENT_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(SORT_LABEL_KEY[option])}
              </option>
            ))}
          </select>
        </label>
      </div>

      <StateFilterChips
        value={stateFilter}
        onChange={onStateFilterChange}
        countByFilter={countByFilter}
      />
    </div>
  );
}
