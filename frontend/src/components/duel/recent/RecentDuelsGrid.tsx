'use client';

import type { RecentDuel } from '@/hooks/useRecentDuels';
import { useTranslation } from '@/i18n/useTranslation';
import type { DuelMeta } from '@/lib/game';
import { getCardShapeForIndex } from './cardShapes';
import { DuelCardShapeDefs } from './DuelCardShapeDefs';
import { RecentDuelCard } from './RecentDuelCard';

interface RecentDuelsGridProps {
  duels: RecentDuel[];
  isLoading: boolean;
  metaByDuelId: Record<number, DuelMeta>;
  resolveDisplay: (address: string) => string;
  nicknameByAddress: Record<string, string | null>;
}

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

  return (
    <>
      <DuelCardShapeDefs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-x-4">
        {duels.map((duel, index) => {
          const meta = metaByDuelId[duel.id];
          const shape = getCardShapeForIndex(index, duels.length);
          return (
            <RecentDuelCard
              key={duel.id}
              duel={duel}
              gameName={meta?.gameName}
              gameSlug={meta?.gameSlug}
              resolveDisplay={resolveDisplay}
              nicknameByAddress={nicknameByAddress}
              shape={shape}
            />
          );
        })}
      </div>
    </>
  );
}
