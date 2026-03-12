'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DuelCard } from '@/components/duel/DuelCard';
import { useAppToast } from '@/hooks/useAppToast';
import { useDuelActions } from '@/hooks/useDuelActions';
import { useTranslation } from '@/i18n/useTranslation';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { useWallets } from '@privy-io/react-auth';
import { usePlayerDuels } from '@/hooks/usePlayerDuels';
import { DuelState } from '@/lib/contracts';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { getClaimableAmountForAddress, getRelevantDuelTimestamp } from '@/lib/duel';
import { formatUSDT } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccount, useSwitchChain } from 'wagmi';
import { Swords, Trophy, XCircle, BarChart3, Info, Wallet } from 'lucide-react';

const DASHBOARD_CHAIN = SUPPORTED_CHAINS.arbitrumSepolia;

export default function DashboardPage() {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address as `0x${string}` | undefined;
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [claimTarget, setClaimTarget] = useState<'all' | number | null>(null);

  const { wins, losses, totalWagered, totalWithdrawn, activeDuels, historyDuels, isLoading, refetch } =
    usePlayerDuels(walletAddress, DASHBOARD_CHAIN.id);
  const { claimPayouts, isPending, isConfirming, isSuccess, error, reset } = useDuelActions(DASHBOARD_CHAIN.id);

  const displayDuels = activeTab === 'active' ? activeDuels : historyDuels;
  const claimableDuels = historyDuels.filter((duel) => getClaimableAmountForAddress(duel, walletAddress) > 0n);
  const totalClaimable = claimableDuels.reduce(
    (sum, duel) => sum + getClaimableAmountForAddress(duel, walletAddress),
    0n
  );

  async function ensureChain() {
    if (chainId !== DASHBOARD_CHAIN.id) {
      appToast.info('toast.switchingNetwork', { chain: DASHBOARD_CHAIN.name });
      try {
        await switchChainAsync({ chainId: DASHBOARD_CHAIN.id });
      } catch {
        appToast.error('toast.switchNetworkFailed', { chain: DASHBOARD_CHAIN.name });
        return false;
      }
    }
    return true;
  }

  async function handleClaimAll() {
    if (!claimableDuels.length) return;
    if (!(await ensureChain())) return;
    setClaimTarget('all');
    appToast.info('toast.claimingPayouts');
    claimPayouts(claimableDuels.map((duel) => BigInt(duel.id)));
  }

  async function handleClaimSingle(duelId: number) {
    if (!(await ensureChain())) return;
    setClaimTarget(duelId);
    appToast.info('toast.claimingPayout');
    claimPayouts([BigInt(duelId)]);
  }

  useEffect(() => {
    if (!isSuccess) return;

    appToast.success(claimTarget === 'all' ? 'toast.payoutsClaimed' : 'toast.payoutClaimed');
    reset();
    setClaimTarget(null);
    void refetch();
  }, [isSuccess, claimTarget, appToast, reset, refetch]);

  useEffect(() => {
    if (!error) return;

    appToast.transactionError(error);
    reset();
    setClaimTarget(null);
  }, [error, appToast, reset]);

  function getLastEventLabelKey(state: DuelState) {
    switch (state) {
      case DuelState.Cancelled:
        return 'duel.timelineCancelled' as const;
      case DuelState.Declined:
        return 'duel.timelineDeclined' as const;
      case DuelState.Resolved:
        return 'duel.timelineResolved' as const;
      case DuelState.Refunded:
        return 'duel.timelineRefunded' as const;
      case DuelState.Disputed:
        return 'duel.timelineDisputed' as const;
      case DuelState.MutualCancelRequested:
        return 'duel.timelineCancellationRequested' as const;
      case DuelState.MutuallyCancelled:
        return 'duel.timelineMutuallyCancelled' as const;
      case DuelState.WinnerClaimed:
        return 'duel.timelineResultSubmitted' as const;
      case DuelState.Funded:
        return 'duel.timelineAccepted' as const;
      default:
        return 'duel.timelineCreated' as const;
    }
  }

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
              <p className="text-sm font-semibold text-emerald-900">
                {t('dashboard.availableToClaim')}: {formatUSDT(totalClaimable)} USDT
              </p>
              <p className="text-sm text-emerald-800">{t('dashboard.claimAllHint')}</p>
            </div>

            <Button
              size="lg"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
              onClick={handleClaimAll}
              disabled={isPending || isConfirming}
            >
              {claimTarget === 'all' ? t('status.claiming') : t('action.claimAll')}
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

      {/* Duels list */}
      <div className="mt-6 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : displayDuels.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white py-16">
            <Swords className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t('dashboard.noDuels')}</p>
            <Link href="/duel/create">
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                {t('hero.cta')}
              </Button>
            </Link>
          </div>
        ) : (
          displayDuels.map((duel) => (
            <DuelCard
              key={duel.id}
              duelId={duel.id}
              creator={duel.creator}
              opponent={duel.opponent}
              wager={duel.wager}
              state={duel.state}
              chain={duel.chainName}
              chainId={duel.chainId}
              lastEventLabelKey={getLastEventLabelKey(duel.state)}
              lastEventAt={getRelevantDuelTimestamp(duel)}
              claimableAmount={getClaimableAmountForAddress(duel, walletAddress)}
              onClaim={
                getClaimableAmountForAddress(duel, walletAddress) > 0n
                  ? () => handleClaimSingle(duel.id)
                  : undefined
              }
              isClaiming={Boolean((isPending || isConfirming) && (claimTarget === 'all' || claimTarget === duel.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
