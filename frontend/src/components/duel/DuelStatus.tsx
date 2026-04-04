'use client';

import { DuelState, type Duel } from '@/lib/contracts';
import { formatUSDT, truncateAddress } from '@/lib/utils';
import { ZERO_ADDRESS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useTranslation } from '@/i18n/useTranslation';
import { getDuelStateLabelKey } from '@/lib/duel';

interface DuelStatusProps {
  duel: Duel;
  duelId: number;
}

const STATUS_COLORS: Record<DuelState, string> = {
  [DuelState.Created]: 'bg-blue-50 text-blue-700 border-blue-200',
  [DuelState.Funded]: 'bg-green-50 text-green-700 border-green-200',
  [DuelState.WinnerClaimed]: 'bg-amber-50 text-amber-700 border-amber-200',
  [DuelState.Resolved]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [DuelState.Refunded]: 'bg-slate-50 text-slate-600 border-slate-200',
  [DuelState.Cancelled]: 'bg-slate-50 text-slate-500 border-slate-200',
  [DuelState.Declined]: 'bg-rose-50 text-rose-700 border-rose-200',
  [DuelState.Disputed]: 'bg-orange-50 text-orange-700 border-orange-200',
  [DuelState.MutualCancelRequested]: 'bg-violet-50 text-violet-700 border-violet-200',
  [DuelState.MutuallyCancelled]: 'bg-sky-50 text-sky-700 border-sky-200',
};

export function DuelStatus({ duel, duelId }: DuelStatusProps) {
  const { t } = useTranslation();
  const wagerDisplay = formatUSDT(duel.wagerAmount);
  const isFundedOrBeyond = duel.state === DuelState.Funded
    || duel.state === DuelState.MutualCancelRequested
    || duel.state === DuelState.WinnerClaimed
    || duel.state === DuelState.Resolved
    || duel.state === DuelState.Refunded
    || duel.state === DuelState.Disputed
    || duel.state === DuelState.MutuallyCancelled;
  const potDisplay = isFundedOrBeyond
    ? formatUSDT(duel.wagerAmount * 2n)
    : wagerDisplay;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Duel #{duelId}
        </CardTitle>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            STATUS_COLORS[duel.state]
          }`}
        >
          {t(getDuelStateLabelKey(duel.state))}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Wager */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t('duel.wager')}
            </span>
            <span className="text-xl font-bold text-slate-900">
              {wagerDisplay} USDT
            </span>
          </div>

          {/* Total Pot */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t('duel.pot')}
            </span>
            <span className="text-xl font-bold text-indigo-600">
              {potDisplay} USDT
            </span>
          </div>

          {/* Creator */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t('duel.creator')}
            </span>
            <span className="font-mono text-sm text-slate-700">
              {truncateAddress(duel.creator)}
            </span>
          </div>

          {/* Opponent */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t('duel.opponent')}
            </span>
            <span className="font-mono text-sm text-slate-700">
              {duel.opponent === ZERO_ADDRESS
                ? '...'
                : truncateAddress(duel.opponent)}
            </span>
          </div>

          {/* Winner (if resolved) */}
          {duel.state === DuelState.Resolved &&
            duel.claimedWinner !== ZERO_ADDRESS && (
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('duel.winner')}
                </span>
                <span className="font-mono text-sm font-semibold text-emerald-600">
                  {truncateAddress(duel.claimedWinner)}
                </span>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
