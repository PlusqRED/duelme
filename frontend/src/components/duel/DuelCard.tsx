'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlayerDuel } from '@/hooks/usePlayerDuels';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import {
  getClaimableAmountForAddress,
  getCounterpartyAddress,
  getDuelOutcomeSummary,
  getRelevantDuelTimestamp,
  hasClaimedPayoutForAddress,
  truncateUnicode,
} from '@/lib/duel';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { formatDateTime, formatUSDT, truncateAddress } from '@/lib/utils';
import { ArrowUpRight, CheckCircle2, Coins } from 'lucide-react';
import { GameBadge } from '@/components/game/GameBadge';
import { ReputationBadge } from './ReputationBadge';

interface DuelCardProps {
  duel: PlayerDuel;
  viewerAddress?: string;
  onClaim?: () => void;
  isClaiming?: boolean;
  resolveDisplay?: (address: string) => string;
  gameName?: string;
  gameSlug?: string;
}

const STATUS_CONFIG: Record<
  DuelState,
  { key: TranslationKey; colorClass: string }
> = {
  [DuelState.Created]: {
    key: 'duel.waiting',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [DuelState.Funded]: {
    key: 'duel.inProgress',
    colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  [DuelState.WinnerClaimed]: {
    key: 'duel.waitingConfirm',
    colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  [DuelState.Resolved]: {
    key: 'duel.resolved',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [DuelState.Refunded]: {
    key: 'duel.refunded',
    colorClass: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  [DuelState.Cancelled]: {
    key: 'duel.cancelled',
    colorClass: 'bg-slate-50 text-slate-500 border-slate-200',
  },
  [DuelState.Declined]: {
    key: 'duel.declined',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  [DuelState.Disputed]: {
    key: 'duel.disputed',
    colorClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  [DuelState.MutualCancelRequested]: {
    key: 'duel.cancellationPending',
    colorClass: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  [DuelState.MutuallyCancelled]: {
    key: 'duel.mutuallyCancelled',
    colorClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
};

const OUTCOME_TONE_CLASS = {
  win: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  loss: 'border-rose-200 bg-rose-50 text-rose-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

const TERMINAL_STATES = new Set([
  DuelState.Resolved,
  DuelState.Refunded,
  DuelState.Cancelled,
  DuelState.Declined,
  DuelState.Disputed,
  DuelState.MutuallyCancelled,
]);

export function DuelCard({
  duel,
  viewerAddress,
  onClaim,
  isClaiming = false,
  resolveDisplay,
  gameName,
  gameSlug,
}: DuelCardProps) {
  const { t, language } = useTranslation();
  const stateConfig = STATUS_CONFIG[duel.state];
  const claimableAmount = getClaimableAmountForAddress(duel, viewerAddress);
  const hasClaimableAmount = claimableAmount > 0n;
  const hasClaimedAmount = hasClaimedPayoutForAddress(duel, viewerAddress);
  const outcome = getDuelOutcomeSummary(duel, viewerAddress);
  const showOutcomeBadge = TERMINAL_STATES.has(duel.state);
  const hasMessage = hasVisibleDuelMessage(duel.message);
  const counterparty = getCounterpartyAddress(duel, viewerAddress);
  const opponentAddress = counterparty && counterparty !== '0x0000000000000000000000000000000000000000'
    ? counterparty
    : duel.opponent;

  return (
    <div className="card-glow rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <Link href={`/duel/${duel.id}`} className="min-w-0 flex-1">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {duel.wager} USDT
              </span>
              {showOutcomeBadge && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${OUTCOME_TONE_CLASS[outcome.tone]}`}
                >
                  {t(outcome.key)}
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${stateConfig.colorClass}`}
              >
                {t(showOutcomeBadge ? outcome.detailKey : stateConfig.key)}
              </span>
            </div>

            {hasMessage && (
              <div className="inline-flex max-w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                <span className="truncate">{truncateUnicode(duel.message, 48)}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="text-slate-400">{t('dashboard.opponentLabel')}</span>
              {opponentAddress === '0x0000000000000000000000000000000000000000' ? (
                <span className="text-slate-400">{t('dashboard.waitingOpponent')}</span>
              ) : (
                <>
                  <Link
                    href={`/profile/${opponentAddress}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono font-medium text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {resolveDisplay?.(opponentAddress) ?? truncateAddress(opponentAddress)}
                  </Link>
                  <ReputationBadge address={opponentAddress as `0x${string}`} chainId={duel.chainId} />
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge variant="outline" className="shrink-0 text-xs">
                {duel.chainName}
              </Badge>
              {gameName && <GameBadge gameName={gameName} gameSlug={gameSlug} />}
              <span>
                {t('dashboard.lastUpdateLabel')}: {formatDateTime(getRelevantDuelTimestamp(duel), language)}
              </span>
              {hasClaimedAmount && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('dashboard.claimed')}
                </span>
              )}
              {!hasClaimedAmount && hasClaimableAmount && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Coins className="h-3.5 w-3.5" />
                  {t('dashboard.claimReady')}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[220px] lg:items-end">
          {hasClaimableAmount && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-3 text-left lg:text-right">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <Coins className="h-3.5 w-3.5" />
                {t('dashboard.claimReady')}
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-900">
                {formatUSDT(claimableAmount)} USDT
              </div>
            </div>
          )}

          {hasClaimableAmount && onClaim && (
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 text-white shadow-sm shadow-emerald-200 hover:from-emerald-600 hover:via-emerald-700 hover:to-green-700 lg:w-auto"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClaim();
              }}
              disabled={isClaiming}
            >
              {!isClaiming && <ArrowUpRight className="mr-2 h-4 w-4" />}
              {isClaiming
                ? t('status.claiming')
                : t('dashboard.claimButton')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
