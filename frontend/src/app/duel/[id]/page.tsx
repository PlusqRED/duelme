'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShareLink } from '@/components/duel/ShareLink';
import { ClaimButtons } from '@/components/duel/ClaimButtons';
import { ConfirmResult } from '@/components/duel/ConfirmResult';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState } from '@/lib/contracts';
import { truncateAddress } from '@/lib/utils';
import { Clock, Trophy, ArrowLeft, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

// Mock duel data for demonstration
const MOCK_DUEL = {
  id: 1,
  creator: '0x1a2B3c4D5e6F7890abCDeF1234567890AbCdEf12',
  opponent: '0x0000000000000000000000000000000000000000',
  amount: 50,
  state: DuelState.Created,
  winner: '0x0000000000000000000000000000000000000000',
  claimedBy: '0x0000000000000000000000000000000000000000',
  claimTimestamp: 0,
  chain: 'Arbitrum One',
};

const STATUS_CONFIG: Record<
  DuelState,
  { icon: React.ElementType; colorClass: string }
> = {
  [DuelState.Created]: { icon: Clock, colorClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  [DuelState.Funded]: { icon: Clock, colorClass: 'bg-green-50 text-green-700 border-green-200' },
  [DuelState.WinnerClaimed]: { icon: Clock, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  [DuelState.Resolved]: { icon: Trophy, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [DuelState.Refunded]: { icon: RotateCcw, colorClass: 'bg-slate-50 text-slate-600 border-slate-200' },
  [DuelState.Cancelled]: { icon: XCircle, colorClass: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const STATUS_LABELS: Record<DuelState, string> = {
  [DuelState.Created]: 'duel.waiting',
  [DuelState.Funded]: 'duel.inProgress',
  [DuelState.WinnerClaimed]: 'duel.waitingConfirm',
  [DuelState.Resolved]: 'duel.resolved',
  [DuelState.Refunded]: 'duel.refunded',
  [DuelState.Cancelled]: 'duel.cancelled',
};

export default function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const duelId = parseInt(id, 10);

  // Using mock data for now — will be replaced with useDuel hook when contract is deployed
  const duel = { ...MOCK_DUEL, id: duelId };
  const state = duel.state;
  const statusConfig = STATUS_CONFIG[state];
  const StatusIcon = statusConfig.icon;
  const isWaitingOpponent = state === DuelState.Created;
  const isFunded = state === DuelState.Funded;
  const isWinnerClaimed = state === DuelState.WinnerClaimed;
  const isResolved = state === DuelState.Resolved;
  const isRefunded = state === DuelState.Refunded;
  const isCancelled = state === DuelState.Cancelled;
  const ZERO = '0x0000000000000000000000000000000000000000';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.dashboard')}
      </Link>

      {/* Duel card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-900">
            Duel #{duelId}
          </CardTitle>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig.colorClass}`}
          >
            <StatusIcon className="h-3 w-3" />
            {t(STATUS_LABELS[state] as Parameters<typeof t>[0])}
          </span>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Wager info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('duel.wager')}
              </span>
              <span className="text-xl font-bold text-slate-900">
                {duel.amount} USDT
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-indigo-50 p-3">
              <span className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                {t('duel.pot')}
              </span>
              <span className="text-xl font-bold text-indigo-600">
                {duel.opponent !== ZERO ? duel.amount * 2 : duel.amount} USDT
              </span>
            </div>
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('duel.creator')}
              </span>
              <span className="font-mono text-sm text-slate-700">
                {truncateAddress(duel.creator)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('duel.opponent')}
              </span>
              <span className="font-mono text-sm text-slate-700">
                {duel.opponent === ZERO ? '...' : truncateAddress(duel.opponent)}
              </span>
            </div>
          </div>

          {/* Chain */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {duel.chain}
            </Badge>
          </div>

          {/* Conditional sections based on state */}

          {/* Created — show share link and join button */}
          {isWaitingOpponent && (
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
              <ShareLink duelId={duelId} />
              <Button
                size="lg"
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {t('action.join')}
              </Button>
            </div>
          )}

          {/* Funded — show claim buttons */}
          {isFunded && (
            <div className="border-t border-slate-100 pt-4">
              <ClaimButtons
                onClaimVictory={() => {}}
                onAdmitDefeat={() => {}}
                isPending={false}
              />
            </div>
          )}

          {/* WinnerClaimed — show confirm result */}
          {isWinnerClaimed && (
            <div className="border-t border-slate-100 pt-4">
              <ConfirmResult
                claimedBy={duel.claimedBy}
                claimTimestamp={duel.claimTimestamp}
                onConfirm={() => {}}
                isPending={false}
              />
            </div>
          )}

          {/* Resolved — show winner and claim */}
          {isResolved && duel.winner !== ZERO && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <Trophy className="h-5 w-5 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-emerald-600">
                    {t('duel.winner')}
                  </span>
                  <span className="font-mono text-sm font-semibold text-emerald-700">
                    {truncateAddress(duel.winner)}
                  </span>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {t('action.claimPrize')}
              </Button>
            </div>
          )}

          {/* Refunded */}
          {isRefunded && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 border-t border-slate-100 mt-0">
              <RotateCcw className="h-5 w-5 text-slate-500" />
              <span className="text-sm text-slate-600">{t('duel.refunded')}</span>
            </div>
          )}

          {/* Cancelled */}
          {isCancelled && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 border-t border-slate-100 mt-0">
              <XCircle className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-500">{t('duel.cancelled')}</span>
            </div>
          )}

          {/* Cancel button (only for creator when waiting) */}
          {isWaitingOpponent && (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
              {t('action.cancel')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
