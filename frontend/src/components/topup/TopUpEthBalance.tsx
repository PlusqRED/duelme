'use client';

import { Icon } from '@/components/ui/icon';
import { BalanceReadFailed } from '@/components/wallet/BalanceReadFailed';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceReading } from '@/lib/balanceStatus';
import { formatEthBalance, formatEthNeed } from '@/lib/gasNeeds';
import { cn } from '@/lib/utils';
import { readingFigure } from '@/lib/walletBalances';

interface TopUpEthBalanceProps {
  networkName: string;
  balance: BalanceReading;
  /** What the transactions still to send may take in fees, in wei. */
  neededWei: bigint;
  onRetry: () => void;
}

/** The ETH on the network being topped up for a signing window, against what its fees may take. */
export function TopUpEthBalance({ networkName, balance, neededWei, onRetry }: TopUpEthBalanceProps) {
  const { t, language } = useTranslation();
  const isShort = balance.kind === 'ready' && balance.raw < neededWei;
  const figure = readingFigure(balance, (raw) => `${formatEthBalance(raw, language)} ETH`);

  return (
    <div
      aria-live="polite"
      className={cn('grid gap-0.5 rounded-tile bg-canvas px-4 py-3.5', isShort && 'bg-orange-wash ring-[1.5px] ring-orange-line ring-inset')}
    >
      <p className="text-note font-label text-ink-3">{t('topup.balance', { network: networkName })}</p>
      <b className="my-0.5 text-figure font-extrabold tabular-nums">{figure}</b>
      {balance.kind === 'error' && <BalanceReadFailed onRetry={onRetry} />}
      <p className="text-body-sm text-ink-2">{t('topup.needed.eth', { amount: formatEthNeed(neededWei, language) })}</p>
      {balance.kind === 'ready' &&
        (isShort ? (
          <p className="mt-1 font-strong text-orange-ink">{t('topup.eth.short')}</p>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 font-strong text-good-ink">
            <Icon name="check" className="size-[17px] stroke-[2.6]" />
            {t('topup.eth.enough')}
          </p>
        ))}
      <p className="text-sm text-ink-3">{t('topup.auto')}</p>
    </div>
  );
}
