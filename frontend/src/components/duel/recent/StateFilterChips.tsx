'use client';

import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { cn } from '@/lib/utils';
import {
  RECENT_STATE_FILTERS,
  type RecentStateFilter,
} from '@/lib/recentDuelsFilters';

const FILTER_LABEL_KEY: Record<RecentStateFilter, TranslationKey> = {
  all: 'recent.filter.all',
  live: 'recent.filter.live',
  resolved: 'recent.filter.resolved',
  refunded: 'recent.filter.refunded',
  cancelled: 'recent.filter.cancelled',
  disputed: 'recent.filter.disputed',
};

interface StateFilterChipsProps {
  value: RecentStateFilter;
  onChange: (next: RecentStateFilter) => void;
  countByFilter: Record<RecentStateFilter, number>;
}

export function StateFilterChips({ value, onChange, countByFilter }: StateFilterChipsProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
      role="group"
      aria-label={t('recent.filter.groupLabel')}
    >
      {RECENT_STATE_FILTERS.map((filter) => {
        const isActive = filter === value;
        const count = countByFilter[filter] ?? 0;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(filter)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'border-indigo-200 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
            )}
          >
            <span>{t(FILTER_LABEL_KEY[filter])}</span>
            <span
              className={cn(
                'inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-tight',
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
