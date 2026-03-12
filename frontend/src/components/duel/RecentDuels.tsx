'use client';

import { useRecentDuels } from '@/hooks/useRecentDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState } from '@/lib/contracts';
import { formatDateTime, truncateAddress } from '@/lib/utils';
import { ReputationBadge } from './ReputationBadge';
import { Trophy } from 'lucide-react';

const STATUS_KEY: Record<DuelState, string> = {
  [DuelState.Created]: 'duel.waiting',
  [DuelState.Funded]: 'duel.inProgress',
  [DuelState.WinnerClaimed]: 'duel.waitingConfirm',
  [DuelState.Resolved]: 'duel.resolved',
  [DuelState.Refunded]: 'duel.refunded',
  [DuelState.Cancelled]: 'duel.cancelled',
  [DuelState.Declined]: 'duel.declined',
  [DuelState.Disputed]: 'duel.disputed',
  [DuelState.MutualCancelRequested]: 'duel.cancellationPending',
  [DuelState.MutuallyCancelled]: 'duel.mutuallyCancelled',
};

export function RecentDuels() {
  const { t, language } = useTranslation();
  const { duels, isLoading } = useRecentDuels();

  if (isLoading) {
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
    <div className="w-full">
      {/* Desktop table (md+) */}
      <div className="card-glow hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('recent.players')}
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('duel.wager')}
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('recent.status')}
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('recent.updated')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('create.chain')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {duels.map((duel) => {
              const hasWinner = duel.state === DuelState.Resolved;
              const isPlayer1Winner = hasWinner && duel.winner.toLowerCase() === duel.player1.toLowerCase();
              return (
                <tr
                  key={duel.id}
                  className="transition-colors hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <ReputationBadge
                          address={duel.player1}
                          chainId={duel.chainId}
                        />
                        <span
                          className={`font-mono text-sm ${
                            isPlayer1Winner
                              ? 'font-semibold text-slate-900'
                              : hasWinner
                                ? 'text-slate-500'
                                : 'text-slate-700'
                          }`}
                        >
                          {truncateAddress(duel.player1)}
                        </span>
                      </div>
                      <span className="vs-badge">VS</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-sm ${
                            hasWinner
                              ? !isPlayer1Winner
                                ? 'font-semibold text-slate-900'
                                : 'text-slate-500'
                              : 'text-slate-700'
                          }`}
                        >
                          {truncateAddress(duel.player2)}
                        </span>
                        <ReputationBadge
                          address={duel.player2}
                          chainId={duel.chainId}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">
                      {duel.wager} USDT
                    </span>
                  </td>
                   <td className="px-4 py-3">
                     <div className="space-y-1">
                       <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                         {t(STATUS_KEY[duel.state] as Parameters<typeof t>[0])}
                       </span>
                       {duel.state === DuelState.Resolved && (
                         <div className="flex items-center gap-1.5">
                           <Trophy className="h-3.5 w-3.5 text-amber-500" />
                           <span className="font-mono text-sm font-medium text-emerald-600">
                             {truncateAddress(duel.winner)}
                           </span>
                         </div>
                       )}
                     </div>
                   </td>
                   <td className="px-4 py-3 text-sm text-slate-500">
                     {formatDateTime(duel.lastEventAt, language)}
                   </td>
                   <td className="px-4 py-3 text-right">
                     <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {duel.chainName}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (< md) */}
      <div className="flex flex-col gap-3 md:hidden">
        {duels.map((duel) => {
          const hasWinner = duel.state === DuelState.Resolved;
          const isPlayer1Winner = hasWinner && duel.winner.toLowerCase() === duel.player1.toLowerCase();
          return (
            <div
              key={duel.id}
              className="card-glow rounded-xl border border-slate-200 bg-white p-4"
            >
              {/* Players row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-1.5">
                    <ReputationBadge
                      address={duel.player1}
                      chainId={duel.chainId}
                    />
                     <span
                       className={`font-mono text-sm ${
                         isPlayer1Winner
                           ? 'font-semibold text-slate-900'
                           : hasWinner
                             ? 'text-slate-500'
                             : 'text-slate-700'
                       }`}
                     >
                       {truncateAddress(duel.player1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ReputationBadge
                      address={duel.player2}
                      chainId={duel.chainId}
                    />
                     <span
                       className={`font-mono text-sm ${
                         hasWinner
                           ? !isPlayer1Winner
                             ? 'font-semibold text-slate-900'
                             : 'text-slate-500'
                           : 'text-slate-700'
                       }`}
                     >
                       {truncateAddress(duel.player2)}
                    </span>
                  </div>
                </div>
                <span className="vs-badge shrink-0">VS</span>
              </div>
              {/* Bottom row: wager, winner, chain */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm font-semibold text-slate-900">
                  {duel.wager} USDT
                </span>
                <div className="flex flex-col items-center gap-1">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {t(STATUS_KEY[duel.state] as Parameters<typeof t>[0])}
                  </span>
                  {duel.state === DuelState.Resolved && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-mono text-xs font-medium text-emerald-600">
                        {truncateAddress(duel.winner)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {duel.chainName}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {t('recent.updated')}: {formatDateTime(duel.lastEventAt, language)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
