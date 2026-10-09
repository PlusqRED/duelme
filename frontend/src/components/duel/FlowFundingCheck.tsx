'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DepositBalance } from '@/components/wallet/DepositBalance';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import { useTranslation } from '@/i18n/useTranslation';
import { formatUSDT } from '@/lib/utils';

interface FlowFundingCheckProps {
  review: FlowReviewGate;
  chainName: string;
}

/**
 * The balance line on the create and join review steps: the player's balance on the duel's
 * network, and — only once a fresh read shows it is short — how much is missing and a way to top up.
 */
export function FlowFundingCheck({ review, chainName }: FlowFundingCheckProps) {
  const { t } = useTranslation();
  const { funding, blockedReason } = review;
  const { status } = funding;

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <DepositBalance
        label={t('deposit.balance.yours', { chain: chainName })}
        balance={funding.balance}
        onRetry={funding.retry}
      />
      {status.kind === 'short' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-amber-700">
            {t('deposit.short', { amount: formatUSDT(status.shortfallRaw) })}
          </span>
          <Button type="button" onClick={funding.showDeposit} className="h-11 px-4">
            <Plus className="h-4 w-4" />
            {t('deposit.topUp')}
          </Button>
        </div>
      )}
      {blockedReason && (
        <p role="alert" className="text-sm font-medium text-red-700">{t(blockedReason)}</p>
      )}
    </div>
  );
}
