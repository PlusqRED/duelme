'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DuelState } from '@/lib/contracts';
import { truncateAddress } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { ReputationBadge } from './ReputationBadge';

interface DuelCardProps {
  duelId: number;
  creator: string;
  opponent: string;
  wager: number;
  state: DuelState;
  chain: string;
  chainId: number;
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
    colorClass: 'bg-green-50 text-green-700 border-green-200',
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
};

export function DuelCard({
  duelId,
  creator,
  opponent,
  wager,
  state,
  chain,
  chainId,
}: DuelCardProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[state];

  return (
    <Link href={`/duel/${duelId}`}>
      <Card className="card-glow border-slate-200 bg-white shadow-sm">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {wager} USDT
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.colorClass}`}
              >
                {t(config.key)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
              <span className="font-mono">{truncateAddress(creator)}</span>
              <ReputationBadge address={creator as `0x${string}`} chainId={chainId} />
              <span className="vs-badge">VS</span>
              {opponent === '0x0000000000000000000000000000000000000000' ? (
                <span>...</span>
              ) : (
                <>
                  <span className="font-mono">{truncateAddress(opponent)}</span>
                  <ReputationBadge address={opponent as `0x${string}`} chainId={chainId} />
                </>
              )}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {chain}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
