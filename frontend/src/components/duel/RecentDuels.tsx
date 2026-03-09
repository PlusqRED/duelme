'use client';

import { useRecentDuels } from '@/hooks/useRecentDuels';
import { useTranslation } from '@/i18n/useTranslation';
import { truncateAddress } from '@/lib/utils';
import { Trophy } from 'lucide-react';

export function RecentDuels() {
  const { t } = useTranslation();
  const { duels, isLoading } = useRecentDuels();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                Players
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                {t('duel.wager')}
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400 sm:table-cell">
                {t('duel.winner')}
              </th>
              <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-400 md:table-cell">
                {t('create.chain')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {duels.map((duel) => {
              const isPlayer1Winner = duel.winner === duel.player1;
              return (
                <tr
                  key={duel.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-sm ${
                          isPlayer1Winner
                            ? 'font-semibold text-gray-900'
                            : 'text-gray-500'
                        }`}
                      >
                        {truncateAddress(duel.player1)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {t('recent.vs')}
                      </span>
                      <span
                        className={`font-mono text-sm ${
                          !isPlayer1Winner
                            ? 'font-semibold text-gray-900'
                            : 'text-gray-500'
                        }`}
                      >
                        {truncateAddress(duel.player2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      {duel.wager} USDT
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-mono text-sm font-medium text-emerald-600">
                        {truncateAddress(duel.winner)}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right md:table-cell">
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {duel.chain}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
