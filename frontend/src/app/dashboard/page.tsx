'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DuelCard } from '@/components/duel/DuelCard';
import { useActionFlow } from '@/hooks/useActionFlow';
import { useTranslation } from '@/i18n/useTranslation';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { useNicknames } from '@/hooks/useNicknames';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import { usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePlayerDuels } from '@/hooks/usePlayerDuels';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { getClaimableAmountForAddress } from '@/lib/duel';
import { buildDashboardDuelSearchText } from '@/lib/duelSearch';
import { formatUSDT } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Swords, Trophy, XCircle, BarChart3, Info, Wallet, Search } from 'lucide-react';
import { ActionFlowDialog } from '@/components/duel/ActionFlowDialog';
import type { ActionFlowSummaryContext } from '@/lib/actionFlow';
import { claimAllConfig, claimPayoutConfig } from '@/lib/actionFlowConfigs';

const DASHBOARD_CHAIN = SUPPORTED_CHAINS.arbitrumSepolia;
const PAGE_SIZE = 20;

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const { authenticated } = usePrivy();
  const { walletAddress } = useActiveWallet();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const { wins, losses, totalWagered, totalWithdrawn, activeDuels, historyDuels, isLoading, refetch } =
    usePlayerDuels(walletAddress, DASHBOARD_CHAIN.id);
  const actionFlow = useActionFlow({ duelId: 0, refetchDuel: refetch });
  const [claimSummary, setClaimSummary] = useState<Pick<ActionFlowSummaryContext, 'duelId' | 'claimableDisplay'>>({ duelId: 0, claimableDisplay: '' });

  const claimableDuels = authenticated
    ? historyDuels.filter((duel) => getClaimableAmountForAddress(duel, walletAddress) > 0n)
    : [];
  const totalClaimable = claimableDuels.reduce(
    (sum, duel) => sum + getClaimableAmountForAddress(duel, walletAddress),
    0n
  );
  const duelParticipantAddresses = useMemo(
    () => [...activeDuels, ...historyDuels].flatMap((duel) => [duel.creator, duel.opponent]),
    [activeDuels, historyDuels]
  );
  const { reputationByAddress } = useReputationLevels(duelParticipantAddresses, DASHBOARD_CHAIN.id);
  const { resolveDisplay, nicknameByAddress } = useNicknames(duelParticipantAddresses);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredActiveDuels = useMemo(
    () => activeDuels.filter((duel) => (
      !normalizedSearchQuery
      || buildDashboardDuelSearchText(duel, walletAddress, t, language, reputationByAddress, nicknameByAddress)
        .includes(normalizedSearchQuery)
    )),
    [activeDuels, normalizedSearchQuery, walletAddress, t, language, reputationByAddress, nicknameByAddress]
  );
  const filteredHistoryDuels = useMemo(
    () => historyDuels.filter((duel) => (
      !normalizedSearchQuery
      || buildDashboardDuelSearchText(duel, walletAddress, t, language, reputationByAddress, nicknameByAddress)
        .includes(normalizedSearchQuery)
    )),
    [historyDuels, normalizedSearchQuery, walletAddress, t, language, reputationByAddress, nicknameByAddress]
  );

  const activeTotalPages = Math.max(1, Math.ceil(filteredActiveDuels.length / PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryDuels.length / PAGE_SIZE));
  const safeActivePage = Math.min(activePage, activeTotalPages);
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const displayDuels = activeTab === 'active' ? filteredActiveDuels : filteredHistoryDuels;
  const currentPage = activeTab === 'active' ? safeActivePage : safeHistoryPage;
  const totalPages = activeTab === 'active' ? activeTotalPages : historyTotalPages;
  const paginatedDuels = displayDuels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleClaimAll() {
    if (!claimableDuels.length) return;
    const duelIds = claimableDuels.map((duel) => BigInt(duel.id));
    setClaimSummary({ duelId: 0, claimableDisplay: `${formatUSDT(totalClaimable)} USDT` });
    actionFlow.openFlow(
      claimAllConfig(
        () => actionFlow.duelActions.claimPayouts(duelIds),
        `${formatUSDT(totalClaimable)} USDT`,
        claimableDuels.length,
      )
    );
  }

  function handleClaimSingle(duelId: number) {
    const duel = historyDuels.find((d) => d.id === duelId);
    const amount = duel ? getClaimableAmountForAddress(duel, walletAddress) : 0n;
    setClaimSummary({ duelId, claimableDisplay: `${formatUSDT(amount)} USDT` });
    actionFlow.openFlow(
      claimPayoutConfig(() => actionFlow.duelActions.claimPayout(BigInt(duelId)))
    );
  }

  useEffect(() => {
    setActivePage(1);
    setHistoryPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setActivePage((page) => Math.min(page, activeTotalPages));
  }, [activeTotalPages]);

  useEffect(() => {
    setHistoryPage((page) => Math.min(page, historyTotalPages));
  }, [historyTotalPages]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('dashboard.title')}
      </h1>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Trophy className="h-5 w-5 text-emerald-500" />
            <span className="text-2xl font-bold text-slate-900">
              {wins}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {t('dashboard.wins')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="text-2xl font-bold text-slate-900">
              {losses}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {t('dashboard.losses')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <span className="text-2xl font-bold text-slate-900">
              {totalWagered.toFixed(0)} USDT
            </span>
            <span className="text-xs font-medium text-slate-500">
              {t('dashboard.totalWagered')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Wallet className="h-5 w-5 text-teal-500" />
            <span className="text-2xl font-bold text-slate-900">
              {formatUSDT(totalWithdrawn)} USDT
            </span>
            <span className="text-xs font-medium text-slate-500">
              {t('dashboard.totalWithdrawn')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Swords className="h-5 w-5 text-violet-500" />
            <ReputationBadge address={walletAddress} chainId={DASHBOARD_CHAIN.id} showStats />
            <Tooltip>
              <TooltipTrigger className="flex cursor-help items-center gap-1 text-xs font-medium text-slate-500">
                {t('rep.title')}
                <Info className="h-3 w-3 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                <p className="text-xs leading-relaxed">{t('rep.tooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>
      </div>

      {totalClaimable > 0n && (
        <Card className="mt-6 border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-emerald-950 sm:text-3xl">
                {formatUSDT(totalClaimable)} USDT
              </p>
              <p className="text-sm text-emerald-800">{t('dashboard.claimAllHint')}</p>
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 text-white shadow-sm shadow-emerald-200 hover:from-emerald-600 hover:via-emerald-700 hover:to-green-700 sm:w-auto"
              onClick={handleClaimAll}
              disabled={actionFlow.flow !== null}
            >
              {t('action.claimAll')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('dashboard.active')} {activeDuels.length > 0 && `(${activeDuels.length})`}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('dashboard.history')} {historyDuels.length > 0 && `(${historyDuels.length})`}
        </button>
      </div>

      {(activeDuels.length > 0 || historyDuels.length > 0) && (
        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="duel-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('dashboard.searchPlaceholder')}
              className="h-11 border-slate-200 bg-white pl-10"
            />
          </div>
        </div>
      )}

      {/* Duels list */}
      <div className="mt-6 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : paginatedDuels.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-16">
            <Swords className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              {searchQuery ? t('dashboard.noMatches') : t('dashboard.noDuels')}
            </p>
            {!searchQuery && (
              <Link href="/duel/create">
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                  {t('hero.cta')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          paginatedDuels.map((duel) => (
            <DuelCard
              key={duel.id}
              duel={duel}
              viewerAddress={walletAddress}
              resolveDisplay={resolveDisplay}
              onClaim={
                authenticated && getClaimableAmountForAddress(duel, walletAddress) > 0n
                  ? () => handleClaimSingle(duel.id)
                  : undefined
              }
              isClaiming={actionFlow.flow !== null && (actionFlow.flow.actionType === 'claimAll' || actionFlow.flow.actionType === 'claimPayout')}
            />
          ))
        )}
      </div>

      {displayDuels.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row">
          <span>{t('dashboard.pageSummary', { current: currentPage, total: totalPages })}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => (activeTab === 'active' ? setActivePage((page) => Math.max(1, page - 1)) : setHistoryPage((page) => Math.max(1, page - 1)))}
              disabled={currentPage <= 1}
            >
              {t('action.previous')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => (activeTab === 'active'
                ? setActivePage((page) => Math.min(activeTotalPages, page + 1))
                : setHistoryPage((page) => Math.min(historyTotalPages, page + 1)))}
              disabled={currentPage >= totalPages}
            >
              {t('action.next')}
            </Button>
          </div>
        </div>
      )}

      <ActionFlowDialog
        open={actionFlow.flow !== null}
        canClose={actionFlow.canClose}
        flow={actionFlow.flow}
        config={actionFlow.activeConfig}
        needsNetworkSwitch={actionFlow.needsNetworkSwitch}
        summaryContext={{
          duelId: claimSummary.duelId,
          formattedWager: '',
          formattedPot: '',
          chainName: DASHBOARD_CHAIN.name,
          opponentDisplay: '',
          claimedWinnerDisplay: '',
          claimableDisplay: claimSummary.claimableDisplay || `${formatUSDT(totalClaimable)} USDT`,
          t,
        }}
        onOpenChange={actionFlow.handleFlowOpenChange}
        onContinue={actionFlow.handleContinue}
        onSwitchNetwork={actionFlow.handleSwitchNetwork}
        onExecute={actionFlow.handleExecute}
        onDone={actionFlow.closeFlow}
      />
    </div>
  );
}
