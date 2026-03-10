'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShareLink } from '@/components/duel/ShareLink';
import { ClaimButtons } from '@/components/duel/ClaimButtons';
import { ConfirmResult } from '@/components/duel/ConfirmResult';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState } from '@/lib/contracts';
import { truncateAddress } from '@/lib/utils';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { useDuel } from '@/hooks/useDuel';
import { useDuelActions } from '@/hooks/useDuelActions';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Clock, Trophy, ArrowLeft, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

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

// TODO: detect chain from URL param or duel lookup across chains
const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.arbitrum.id;

export default function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const duelId = parseInt(id, 10);

  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address?.toLowerCase();

  const { duel, isLoading, isError } = useDuel(BigInt(duelId), DEFAULT_CHAIN_ID);
  const {
    joinDuel,
    claimVictory,
    admitDefeat,
    confirmResult,
    refund,
    cancelDuel,
    isPending,
    isConfirming,
  } = useDuelActions(DEFAULT_CHAIN_ID);

  const txPending = isPending || isConfirming;
  const ZERO = '0x0000000000000000000000000000000000000000';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !duel) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-slate-500">Duel not found or contract not deployed yet.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const state = duel.state;
  const statusConfig = STATUS_CONFIG[state];
  const StatusIcon = statusConfig.icon;
  const isWaitingOpponent = state === DuelState.Created;
  const isFunded = state === DuelState.Funded;
  const isWinnerClaimed = state === DuelState.WinnerClaimed;
  const isResolved = state === DuelState.Resolved;
  const isRefunded = state === DuelState.Refunded;
  const isCancelled = state === DuelState.Cancelled;

  const isCreator = walletAddress === duel.creator.toLowerCase();
  const isOpponent = walletAddress === duel.opponent.toLowerCase();
  const isParticipant = isCreator || isOpponent;
  const isClaimAuthor = walletAddress === duel.claimedBy.toLowerCase();

  // Convert wagerAmount from raw (6 decimals) to display
  const wagerDisplay = Number(duel.wagerAmount) / 1e6;
  const potDisplay = duel.opponent !== ZERO ? wagerDisplay * 2 : wagerDisplay;

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
      <Card className="card-glow border-slate-200 bg-white shadow-sm">
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
                {wagerDisplay} USDT
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-indigo-50 p-3">
              <span className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                {t('duel.pot')}
              </span>
              <span className="text-xl font-bold text-indigo-600">
                {potDisplay} USDT
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

          {/* Conditional sections based on state */}

          {/* Created — show share link and join button */}
          {isWaitingOpponent && (
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
              <ShareLink duelId={duelId} />
              {authenticated && !isCreator && (
                <Button
                  size="lg"
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => joinDuel(BigInt(duelId))}
                  disabled={txPending}
                >
                  {txPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Joining...
                    </span>
                  ) : (
                    t('action.join')
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Funded — show claim buttons (only for participants) */}
          {isFunded && isParticipant && (
            <div className="border-t border-slate-100 pt-4">
              <ClaimButtons
                onClaimVictory={() => claimVictory(BigInt(duelId))}
                onAdmitDefeat={() => admitDefeat(BigInt(duelId))}
                isPending={txPending}
              />
            </div>
          )}

          {/* WinnerClaimed — show confirm result (only for the OTHER player) */}
          {isWinnerClaimed && (
            <div className="border-t border-slate-100 pt-4">
              <ConfirmResult
                claimedBy={duel.claimedBy}
                claimTimestamp={Number(duel.claimTimestamp)}
                onConfirm={() => confirmResult(BigInt(duelId))}
                onRefund={() => refund(BigInt(duelId))}
                isPending={txPending}
                canConfirm={isParticipant && !isClaimAuthor}
                canRefund={true}
              />
            </div>
          )}

          {/* Resolved — show winner */}
          {isResolved && duel.claimedWinner !== ZERO && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <Trophy className="h-5 w-5 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-emerald-600">
                    {t('duel.winner')}
                  </span>
                  <span className="font-mono text-sm font-semibold text-emerald-700">
                    {truncateAddress(duel.claimedWinner)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Refunded */}
          {isRefunded && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 border-t border-slate-100">
              <RotateCcw className="h-5 w-5 text-slate-500" />
              <span className="text-sm text-slate-600">{t('duel.refunded')}</span>
            </div>
          )}

          {/* Cancelled */}
          {isCancelled && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 border-t border-slate-100">
              <XCircle className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-500">{t('duel.cancelled')}</span>
            </div>
          )}

          {/* Cancel button (only for creator when waiting for opponent) */}
          {isWaitingOpponent && isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => cancelDuel(BigInt(duelId))}
              disabled={txPending}
            >
              {t('action.cancel')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
