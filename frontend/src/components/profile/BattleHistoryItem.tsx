'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import type { PlayerDuel } from '@/hooks/usePlayerDuels';
import { DuelState } from '@/lib/contracts';
import { truncateAddress } from '@/lib/utils';

interface BattleHistoryItemProps {
  duel: PlayerDuel;
  viewerAddress: string;
  index: number;
}

function outcome(d: PlayerDuel, viewer: string): 'won' | 'lost' | 'cancelled' | 'pending' {
  const v = viewer.toLowerCase();
  if (d.state === DuelState.Resolved) {
    return d.claimedWinner.toLowerCase() === v ? 'won' : 'lost';
  }
  if (
    d.state === DuelState.Cancelled ||
    d.state === DuelState.Declined ||
    d.state === DuelState.MutuallyCancelled ||
    d.state === DuelState.Refunded
  ) {
    return 'cancelled';
  }
  return 'pending';
}

export function BattleHistoryItem({ duel, viewerAddress, index }: BattleHistoryItemProps) {
  const { language } = useTranslation();
  const result = outcome(duel, viewerAddress);
  const opponentAddr =
    duel.creator.toLowerCase() === viewerAddress.toLowerCase() ? duel.opponent : duel.creator;
  const completedAt = duel.finalizedAt > 0n ? new Date(Number(duel.finalizedAt) * 1000) : null;
  const dateStr = completedAt
    ? completedAt.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium' })
    : '—';

  const colors: Record<typeof result, string> = {
    won: 'border-emerald-200 bg-emerald-50',
    lost: 'border-rose-200 bg-rose-50',
    cancelled: 'border-slate-200 bg-slate-50',
    pending: 'border-amber-200 bg-amber-50',
  };

  const labels: Record<typeof result, string> = {
    won: 'W',
    lost: 'L',
    cancelled: '—',
    pending: '…',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-sm ${colors[result]}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
            result === 'won'
              ? 'bg-emerald-500 text-white'
              : result === 'lost'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-300 text-slate-600'
          }`}
        >
          {labels[result]}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${opponentAddr}`}
            className="font-mono text-xs text-slate-700 hover:underline"
          >
            {truncateAddress(opponentAddr)}
          </Link>
          <div className="text-[11px] text-slate-500">{dateStr}</div>
        </div>
      </div>
      <span className="font-mono text-xs font-medium text-slate-900 shrink-0">
        {duel.wager} USDT
      </span>
    </motion.div>
  );
}
