'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { Hourglass, Trophy, User } from 'lucide-react';
import { CopyableAddress } from '@/components/duel/CopyableAddress';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

interface PlayerCardProps {
  address: string;
  label: string;
  isWinner: boolean;
  isReportedWinner: boolean;
  isYou: boolean;
  isEmpty: boolean;
  nickname?: string | null;
}

export function PlayerCard({
  address,
  label,
  isWinner,
  isReportedWinner,
  isYou,
  isEmpty,
  nickname,
}: PlayerCardProps) {
  const { t } = useTranslation();
  const highlightClass = isWinner
    ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
    : isReportedWinner
      ? 'border-amber-300 bg-amber-50 shadow-lg shadow-amber-100'
      : isEmpty
        ? 'border-dashed border-slate-300 bg-slate-50'
        : 'border-slate-200 bg-slate-50';

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      {/* Avatar circle */}
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all sm:h-20 sm:w-20 ${highlightClass}`}
      >
        {isEmpty ? (
          <Hourglass className="h-6 w-6 text-slate-300" />
        ) : isWinner ? (
          <Trophy className="h-7 w-7 text-emerald-500" />
        ) : isReportedWinner ? (
          <Trophy className="h-7 w-7 text-amber-500" />
        ) : (
          <User className="h-7 w-7 text-slate-400" />
        )}
        {isYou && (
          <span className="absolute -bottom-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            {t('duel.you')}
          </span>
        )}
      </div>

      {/* Label */}
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>

      {/* Address + rep */}
      {isEmpty ? (
        <span className="text-xs text-slate-400">...</span>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <CopyableAddress
            address={address}
            nickname={nickname}
            href={`/profile/${address}`}
            className={
              isWinner
                ? 'font-semibold text-emerald-700'
                : isReportedWinner
                  ? 'font-semibold text-amber-700'
                  : undefined
            }
          />
          <ReputationBadge address={address as `0x${string}`} chainId={DEFAULT_CHAIN_ID} />
        </div>
      )}
    </div>
  );
}
