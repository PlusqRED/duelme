'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { REP_DOT_COLOR, type EnrichedDuel } from '@/lib/openDuelsFilters';
import { Globe, Gamepad2, Clock } from 'lucide-react';

interface OpenDuelCardProps {
  duel: EnrichedDuel;
  timeAgo: (timestamp: bigint) => string;
}

export function OpenDuelCard({ duel, timeAgo }: OpenDuelCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={`/duel/${duel.id}`}
      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-indigo-200 hover:shadow-sm"
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        {/* Game + time */}
        <div className="flex items-center gap-2 text-xs">
          {duel.gameName ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                <Gamepad2 className="h-3 w-3" />
                {duel.gameName}
              </span>
              {duel.gameCategory && (
                <span className="text-slate-400">{duel.gameCategory}</span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              <Globe className="h-2.5 w-2.5" />
              {t('duel.public')}
            </span>
          )}
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="h-3 w-3" />
            {timeAgo(duel.createdAt)}
          </span>
        </div>

        {/* Wager */}
        <span className="text-base font-bold text-slate-900">
          {duel.wager} <span className="text-sm font-normal text-slate-400">USDT</span>
        </span>

        {/* Creator + reputation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{t('duel.createdBy')} {duel.creatorName}</span>
          {duel.reputation && (
            <span
              className={`inline-block h-2 w-2 rounded-full ${REP_DOT_COLOR[duel.reputation]}`}
              title={duel.reputation}
            />
          )}
        </div>

        {/* Message */}
        {hasVisibleDuelMessage(duel.message) && (
          <span className="text-xs text-slate-400 italic truncate">
            &ldquo;{truncateUnicode(duel.message, 50)}&rdquo;
          </span>
        )}
      </div>

      <Button
        size="sm"
        className="bg-indigo-600 text-white hover:bg-indigo-700 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
      >
        {t('action.join')}
      </Button>
    </Link>
  );
}
