'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { BalanceReadFailed } from '@/components/wallet/BalanceReadFailed';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceStatus, FundingStatus } from '@/lib/balanceStatus';
import { cn, formatUSDT } from '@/lib/utils';

interface WalletPurseProps {
  isSignedIn: boolean;
  balance: BalanceStatus;
  /** Whether the balance covers the stake; unknown without a stake or a fresh balance. */
  funding: FundingStatus;
  onTopUp: () => void;
  onRetry: () => void;
}

/** What is in the wallet, next to what the stake needs: enough, or how much is missing and Top up. */
export function WalletPurse({ isSignedIn, balance, funding, onTopUp, onRetry }: WalletPurseProps) {
  const { t, language } = useTranslation();
  const isShort = funding.kind === 'short';

  return (
    <div
      aria-live="polite"
      className={cn(
        'flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-canvas px-3.5 py-2.5',
        isShort && 'bg-orange-wash shadow-[inset_0_0_0_1.5px_var(--color-orange-line)]'
      )}
    >
      <Icon name="wallet" className="size-[22px] text-ink-3" />
      {!isSignedIn ? (
        <span className="min-w-0 text-body-sm text-ink-2">{t('create.balance.signIn')}</span>
      ) : (
        <>
          <span className="grid min-w-0 text-body-sm text-ink-2">
            <small className="text-note text-ink-3">{t('create.balance')}</small>
            {balance.kind === 'ready' ? (
              <b className="font-extrabold text-ink tabular-nums">{formatUSDT(balance.raw, language)}&nbsp;USDT</b>
            ) : (
              <span className="text-ink-3">{balance.kind === 'checking' ? t('topup.checking') : '—'}</span>
            )}
          </span>
          {balance.kind === 'error' && <BalanceReadFailed onRetry={onRetry} />}
          {funding.kind === 'short' && (
            <>
              <span className="ml-auto inline-flex items-center gap-[5px] text-body-sm font-bold text-orange-ink max-[459px]:ml-[34px]">
                {t('topup.short', { amount: formatUSDT(funding.shortfallRaw, language) })}
              </span>
              <Button type="button" size="sm" onClick={onTopUp} className="mb-1 max-[459px]:flex-[1_1_100%]">
                <Icon name="plus" />
                {t('topup.action')}
              </Button>
            </>
          )}
          {funding.kind === 'enough' && (
            <span className="ml-auto inline-flex items-center gap-[5px] text-body-sm font-bold text-good-ink max-[459px]:ml-[34px]">
              <Icon name="check" className="size-[17px]" />
              {t('topup.enough')}
            </span>
          )}
        </>
      )}
    </div>
  );
}
