'use client';

import { ChevronRight } from 'lucide-react';
import type { RecentDuel } from '@/hooks/useRecentDuels';
import { useTranslation } from '@/i18n/useTranslation';
import type { DuelMeta } from '@/lib/game';
import { RecentDuelCard } from './RecentDuelCard';

interface RecentDuelsGridProps {
  duels: RecentDuel[];
  isLoading: boolean;
  metaByDuelId: Record<number, DuelMeta>;
  resolveDisplay: (address: string) => string;
  nicknameByAddress: Record<string, string | null>;
}

const LG_COLUMN_COUNT = 3;

export function RecentDuelsGrid({
  duels,
  isLoading,
  metaByDuelId,
  resolveDisplay,
  nicknameByAddress,
}: RecentDuelsGridProps) {
  const { t } = useTranslation();

  if (isLoading && duels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (duels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">{t('recent.noActivity')}</p>
      </div>
    );
  }

  const lastIndex = duels.length - 1;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-x-7">
      {duels.map((duel, index) => {
        const meta = metaByDuelId[duel.id];
        const isLast = index === lastIndex;
        const isLgRowEnd = (index + 1) % LG_COLUMN_COUNT === 0;
        const showConnector = !isLast && !isLgRowEnd;
        return (
          <div key={duel.id} className="relative h-full">
            <RecentDuelCard
              duel={duel}
              gameName={meta?.gameName}
              gameSlug={meta?.gameSlug}
              resolveDisplay={resolveDisplay}
              nicknameByAddress={nicknameByAddress}
            />
            {showConnector && (
              <span
                className="pointer-events-none absolute right-[-22px] top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-200 bg-white text-indigo-400 shadow-sm lg:flex"
                aria-hidden="true"
              >
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
