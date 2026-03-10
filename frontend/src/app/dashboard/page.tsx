'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DuelCard } from '@/components/duel/DuelCard';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState } from '@/lib/contracts';
import { ReputationBadge } from '@/components/duel/ReputationBadge';
import { useWallets } from '@privy-io/react-auth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Swords, Trophy, XCircle, BarChart3, Info } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address as `0x${string}` | undefined;
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Mock stats — will be populated from contract data
  const stats = {
    wins: 0,
    losses: 0,
    totalWagered: 0,
  };

  // Mock duels — empty for now
  const activeDuels: Array<{
    id: number;
    creator: string;
    opponent: string;
    wager: number;
    state: DuelState;
    chain: string;
    chainId: number;
  }> = [];

  const historyDuels: typeof activeDuels = [];

  const displayDuels = activeTab === 'active' ? activeDuels : historyDuels;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t('dashboard.title')}
      </h1>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Trophy className="h-5 w-5 text-emerald-500" />
            <span className="text-2xl font-bold text-slate-900">
              {stats.wins}
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
              {stats.losses}
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
              ${stats.totalWagered}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {t('dashboard.totalWagered')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Swords className="h-5 w-5 text-violet-500" />
            <ReputationBadge address={walletAddress} chainId={42161} showStats />
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
          {t('dashboard.active')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('dashboard.history')}
        </button>
      </div>

      {/* Duels list */}
      <div className="mt-6 flex flex-col gap-3">
        {displayDuels.length === 0 ? (
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
              chain={duel.chain}
              chainId={duel.chainId}
            />
          ))
        )}
      </div>
    </div>
  );
}
