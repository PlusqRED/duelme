'use client';

import type { ReactNode } from 'react';
import { ArrowUpDown, Gamepad2, Search, Swords } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import {
  NO_GAME_FILTER,
  WAGER_LABELS,
  WAGER_RANGES,
  type SortBy,
  type WagerRange,
} from '@/lib/publicDuelsFilters';
import { cn } from '@/lib/utils';

interface GameOption {
  name: string;
  count: number;
}

interface PublicDuelsFiltersPanelProps {
  searchQuery: string;
  gameOptions: GameOption[];
  gameFilter: string | null;
  wagerRange: WagerRange;
  sortBy: SortBy;
  onSearchChange: (value: string) => void;
  onGameFilterChange: (value: string | null) => void;
  onWagerRangeChange: (value: WagerRange) => void;
  onSortChange: (value: SortBy) => void;
}

export function PublicDuelsFiltersPanel({
  searchQuery,
  gameOptions,
  gameFilter,
  wagerRange,
  sortBy,
  onSearchChange,
  onGameFilterChange,
  onWagerRangeChange,
  onSortChange,
}: PublicDuelsFiltersPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('publicDuels.searchPlaceholder')}
          className="h-11 border-slate-200 bg-white pl-10"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {gameOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Gamepad2 className="mr-1 h-3.5 w-3.5 text-slate-400" />
            <FilterButton active={!gameFilter} onClick={() => onGameFilterChange(null)}>
              {t('publicDuels.allGames')}
            </FilterButton>
            {gameOptions.map((game) => (
              <FilterButton
                key={game.name}
                active={gameFilter === game.name}
                onClick={() => onGameFilterChange(gameFilter === game.name ? null : game.name)}
              >
                {game.name}
                <span className="ml-1 opacity-70">{game.count}</span>
              </FilterButton>
            ))}
            <FilterButton
              active={gameFilter === NO_GAME_FILTER}
              onClick={() => onGameFilterChange(gameFilter === NO_GAME_FILTER ? null : NO_GAME_FILTER)}
            >
              {t('publicDuels.noGame')}
            </FilterButton>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Swords className="mr-1 h-3.5 w-3.5 text-slate-400" />
            {WAGER_RANGES.map((range) => (
              <FilterButton
                key={range.key}
                active={wagerRange === range.key}
                onClick={() => onWagerRangeChange(wagerRange === range.key ? 'all' : range.key)}
              >
                {range.key === 'all' ? t('publicDuels.allWagers') : WAGER_LABELS[range.key]}
              </FilterButton>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            {(['newest', 'highest', 'lowest'] as const).map((sort) => (
              <SortButton
                key={sort}
                active={sortBy === sort}
                onClick={() => onSortChange(sort)}
              >
                {t(`publicDuels.sort${sort.charAt(0).toUpperCase() + sort.slice(1)}` as TranslationKey)}
              </SortButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}

function FilterButton({ active, children, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}

function SortButton({ active, children, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}
