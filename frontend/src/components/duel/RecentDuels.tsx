'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRecentDuels } from '@/hooks/useRecentDuels';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import { buildRecentDuelSearchText } from '@/lib/duelSearch';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { formatDateTime, truncateAddress } from '@/lib/utils';
import { ReputationBadge } from './ReputationBadge';
import { Search, Trophy } from 'lucide-react';

const PAGE_SIZE = 10;

const STATUS_KEY: Record<DuelState, TranslationKey> = {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const participantAddresses = useMemo(
    () => duels.flatMap((duel) => [duel.player1, duel.player2]),
    [duels]
  );
  const { reputationByAddress } = useReputationLevels(participantAddresses, 421614);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredDuels = useMemo(
    () => duels.filter((duel) => (
      !normalizedSearchQuery
      || buildRecentDuelSearchText(duel, t, language, reputationByAddress).includes(normalizedSearchQuery)
    )),
    [duels, normalizedSearchQuery, t, language, reputationByAddress]
  );

  const totalPages = Math.max(1, Math.ceil(filteredDuels.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedDuels = filteredDuels.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const countLabel = normalizedSearchQuery
    ? t('recent.filteredCount', { count: filteredDuels.length, total: duels.length })
    : t('recent.count', { count: duels.length });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {duels.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
            {countLabel}
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder={t('recent.searchPlaceholder')}
              className="h-11 border-slate-200 bg-white pl-10"
            />
          </div>
        </div>
      )}

      {duels.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">{t('recent.noActivity')}</p>
        </div>
      ) : paginatedDuels.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-12">
          <p className="text-sm text-slate-400">{t('recent.noMatches')}</p>
        </div>
      ) : (
        <>
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
                {paginatedDuels.map((duel) => {
                  const hasWinner = duel.state === DuelState.Resolved;
                  const isPlayer1Winner = hasWinner && duel.winner.toLowerCase() === duel.player1.toLowerCase();

                  return (
                    <tr
                      key={duel.id}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/duel/${duel.id}`} className="block space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <ReputationBadge address={duel.player1} chainId={duel.chainId} />
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
                              <ReputationBadge address={duel.player2} chainId={duel.chainId} />
                            </div>
                          </div>
                          {hasVisibleDuelMessage(duel.message) && (
                            <p className="max-w-xl text-xs text-slate-500">
                              {truncateUnicode(duel.message, 56)}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/duel/${duel.id}`} className="block font-semibold text-slate-900">
                          {duel.wager} USDT
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/duel/${duel.id}`} className="block space-y-1">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {t(STATUS_KEY[duel.state])}
                          </span>
                          {duel.state === DuelState.Resolved && (
                            <div className="flex items-center gap-1.5">
                              <Trophy className="h-3.5 w-3.5 text-amber-500" />
                              <span className="font-mono text-sm font-medium text-emerald-600">
                                {truncateAddress(duel.winner)}
                              </span>
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        <Link href={`/duel/${duel.id}`} className="block">
                          {formatDateTime(duel.lastEventAt, language)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/duel/${duel.id}`} className="block">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {duel.chainName}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {paginatedDuels.map((duel) => {
              const hasWinner = duel.state === DuelState.Resolved;
              const isPlayer1Winner = hasWinner && duel.winner.toLowerCase() === duel.player1.toLowerCase();

              return (
                <Link
                  key={duel.id}
                  href={`/duel/${duel.id}`}
                  className="card-glow block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5">
                        <ReputationBadge address={duel.player1} chainId={duel.chainId} />
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
                        <ReputationBadge address={duel.player2} chainId={duel.chainId} />
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

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {duel.wager} USDT
                    </span>
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {t(STATUS_KEY[duel.state])}
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

                  {hasVisibleDuelMessage(duel.message) && (
                    <p className="mt-3 text-xs text-slate-500">
                      {truncateUnicode(duel.message, 56)}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    {t('recent.updated')}: {formatDateTime(duel.lastEventAt, language)}
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {filteredDuels.length > PAGE_SIZE && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row">
          <span>{t('dashboard.pageSummary', { current: safePage, total: totalPages })}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
            >
              {t('action.previous')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
            >
              {t('action.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
