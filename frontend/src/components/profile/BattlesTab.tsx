'use client';

import Link from 'next/link';
import { useTranslation } from '@/i18n/useTranslation';
import { BattleHistoryItem } from './BattleHistoryItem';
import type { PlayerStats } from '@/hooks/usePlayerDuels';

interface BattlesTabProps {
  walletAddress: string;
  stats: PlayerStats;
  isOwner: boolean;
}

export function BattlesTab({ walletAddress, stats, isOwner }: BattlesTabProps) {
  const { t } = useTranslation();
  const allRecent = [...stats.activeDuels, ...stats.historyDuels].slice(0, 5);
  const viewAllHref = isOwner ? '/dashboard' : `/duels/public?player=${walletAddress}`;

  if (allRecent.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm italic text-slate-400">
        {t('profile.empty.battles')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {allRecent.map((duel, i) => (
        <BattleHistoryItem key={duel.id} duel={duel} viewerAddress={walletAddress} index={i} />
      ))}
      <Link
        href={viewAllHref}
        className="self-end pt-2 text-xs font-medium text-indigo-600 hover:underline"
      >
        {t('profile.cta.viewAllBattles')}
      </Link>
    </div>
  );
}
