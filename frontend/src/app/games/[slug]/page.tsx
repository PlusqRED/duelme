'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DuelCard } from '@/components/duel/DuelCard';
import { useGame } from '@/hooks/useGame';
import { useGameDuels } from '@/hooks/useGameDuels';
import { useNicknames } from '@/hooks/useNicknames';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { buildDashboardDuelSearchText } from '@/lib/duelSearch';
import { formatUSDT } from '@/lib/utils';
import { ArrowLeft, BarChart3, Gamepad2, Search, Swords, Zap } from 'lucide-react';

const CHAIN = DEFAULT_CHAIN;
const PAGE_SIZE = 20;

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { t, language } = useTranslation();
  const { game, isLoading: isGameLoading } = useGame(slug);
  const {
    activeDuels, historyDuels, totalVolume, duelsPlayed, activeDuelCount,
    isLoading: isDuelsLoading, isError: isDuelsError,
  } = useGameDuels(game?.slug, CHAIN.id);

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const allAddresses = useMemo(
    () => [...activeDuels, ...historyDuels].flatMap((d) => [d.creator, d.opponent]),
    [activeDuels, historyDuels],
  );
  const { reputationByAddress } = useReputationLevels(allAddresses, CHAIN.id);
  const { resolveDisplay, nicknameByAddress } = useNicknames(allAddresses);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredActive = useMemo(
    () => activeDuels.filter((d) =>
      !normalizedSearch ||
      buildDashboardDuelSearchText(d, undefined, t, language, reputationByAddress, nicknameByAddress)
        .includes(normalizedSearch),
    ),
    [activeDuels, normalizedSearch, t, language, reputationByAddress, nicknameByAddress],
  );
  const filteredHistory = useMemo(
    () => historyDuels.filter((d) =>
      !normalizedSearch ||
      buildDashboardDuelSearchText(d, undefined, t, language, reputationByAddress, nicknameByAddress)
        .includes(normalizedSearch),
    ),
    [historyDuels, normalizedSearch, t, language, reputationByAddress, nicknameByAddress],
  );

  const activeTotalPages = Math.max(1, Math.ceil(filteredActive.length / PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safeActivePage = Math.min(activePage, activeTotalPages);
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const displayDuels = activeTab === 'active' ? filteredActive : filteredHistory;
  const currentPage = activeTab === 'active' ? safeActivePage : safeHistoryPage;
  const totalPages = activeTab === 'active' ? activeTotalPages : historyTotalPages;
  const paginatedDuels = displayDuels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setActivePage(1);
    setHistoryPage(1);
  }

  if (isGameLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-slate-500">{t('game.notFound')}</p>
        <Link href="/games" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          {t('popularGames.viewAll')}
        </Link>
      </div>
    );
  }

  const volumeFormatted = formatUSDT(totalVolume);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {isDuelsError && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('duel.partiallyLoaded')}
        </p>
      )}
      <Link
        href="/games"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.games')}
      </Link>

      {/* Game header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Gamepad2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{game.name}</h1>
              <span className="text-sm text-white/80">
                {t(`category.${game.category}` as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
          <div className="flex flex-col items-center gap-1 py-5">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <span className="text-xl font-bold text-slate-900 sm:text-2xl">
              {volumeFormatted} USDT
            </span>
            <span className="text-xs font-medium text-slate-500">{t('game.totalVolume')}</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-5">
            <Swords className="h-5 w-5 text-violet-500" />
            <span className="text-xl font-bold text-slate-900 sm:text-2xl">{duelsPlayed}</span>
            <span className="text-xs font-medium text-slate-500">{t('game.duelsPlayed')}</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-5">
            <Zap className="h-5 w-5 text-amber-500" />
            <span className="text-xl font-bold text-slate-900 sm:text-2xl">{activeDuelCount}</span>
            <span className="text-xs font-medium text-slate-500">{t('game.activeDuels')}</span>
          </div>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('game.active')} {activeDuels.length > 0 && `(${activeDuels.length})`}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('game.history')} {historyDuels.length > 0 && `(${historyDuels.length})`}
            </button>
          </div>

          {/* Search */}
          {(activeDuels.length > 0 || historyDuels.length > 0) && (
            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('game.searchPlaceholder')}
                className="h-11 border-slate-200 bg-white pl-10"
              />
            </div>
          )}

          {/* Duel list */}
          <div className="mt-6 flex flex-col gap-3">
            {isDuelsLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : paginatedDuels.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-16">
                <Swords className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">
                  {searchQuery
                    ? t('dashboard.noMatches')
                    : activeTab === 'active'
                      ? t('game.noActiveDuels')
                      : t('game.noHistoryDuels')}
                </p>
              </div>
            ) : (
              paginatedDuels.map((duel) => (
                <DuelCard
                  key={duel.id}
                  duel={duel}
                  resolveDisplay={resolveDisplay}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {displayDuels.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row">
              <span>{t('dashboard.pageSummary', { current: currentPage, total: totalPages })}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    activeTab === 'active'
                      ? setActivePage((p) => Math.max(1, p - 1))
                      : setHistoryPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage <= 1}
                >
                  {t('action.previous')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    activeTab === 'active'
                      ? setActivePage((p) => Math.min(activeTotalPages, p + 1))
                      : setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                >
                  {t('action.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
