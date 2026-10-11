'use client';

import { Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceStatus } from '@/lib/deposit';
import { formatUSDT } from '@/lib/utils';

interface DepositBalanceProps {
  label: string;
  balance: BalanceStatus;
  /** Re-reads `balanceOf`. Never a signature or a transaction. */
  onRetry: () => void;
}

/** One balance line with its three distinct states: checking, an amount (0.00 included), failed. */
export function DepositBalance({ label, balance, onRetry }: DepositBalanceProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1" aria-live="polite">
      <span className="text-sm text-slate-600">{label}</span>
      {balance.kind === 'ready' && (
        <span data-testid="deposit-balance" className="text-base font-semibold text-slate-900">
          {formatUSDT(balance.raw)} USDT
        </span>
      )}
      {balance.kind === 'checking' && (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('deposit.balance.checking')}
        </span>
      )}
      {balance.kind === 'no-wallet' && (
        <span className="text-sm text-slate-500">{t('toast.walletNotReady')}</span>
      )}
      {balance.kind === 'error' && (
        <span className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-red-600">
          {t('deposit.balance.failed')}
          <Button type="button" variant="outline" onClick={onRetry} className="h-11 px-3">
            <RotateCw className="h-3.5 w-3.5" />
            {t('deposit.balance.retry')}
          </Button>
        </span>
      )}
    </div>
  );
}
