'use client';

import { Icon } from '@/components/ui/icon';
import { BalanceReadFailed } from '@/components/wallet/BalanceReadFailed';
import { useBalanceFigure } from '@/hooks/useBalanceFigure';
import { useTranslation } from '@/i18n/useTranslation';
import { resolveFunding, type BalanceReading } from '@/lib/balanceStatus';
import { cn, formatUSDT } from '@/lib/utils';
import { readingFigure } from '@/lib/walletBalances';

interface TopUpBalanceProps {
  networkName: string;
  balance: BalanceReading;
  /** Reads the balance again. Never a signature or a transaction. */
  onRetry: () => void;
  /** What the duel being set up or joined takes, in USDT's smallest unit. */
  neededRaw?: bigint;
}

/**
 * The balance on the network being topped up, which counts up and flashes green when a transfer
 * lands; opened for a duel, what it needs and whether the balance covers it now.
 */
export function TopUpBalance({ networkName, balance, onRetry, neededRaw }: TopUpBalanceProps) {
  const { t, language } = useTranslation();
  const { figure, change } = useBalanceFigure(balance);
  const withUnit = (value: string) => (balance.kind === 'ready' ? `${value} USDT` : value);
  const funding = neededRaw === undefined ? null : resolveFunding(balance, neededRaw);

  return (
    <div
      aria-live="polite"
      className={cn(
        'grid gap-0.5 rounded-tile bg-canvas px-4 py-3.5',
        funding?.kind === 'short' && 'bg-orange-wash ring-[1.5px] ring-orange-line ring-inset'
      )}
    >
      <p className="text-note font-label text-ink-3">{t('topup.balance', { network: networkName })}</p>
      {/* The count is for the eye: a screen reader hears the balance it ends on, not every step. */}
      <b aria-hidden="true" className="relative isolate -mx-1.5 my-0.5 justify-self-start px-1.5 text-figure font-extrabold tabular-nums">
        {change && change.delta > 0n && (
          <span key={change.id} className="absolute inset-0 -z-1 animate-gain-ring rounded-lg bg-good-soft opacity-0" />
        )}
        {withUnit(figure)}
      </b>
      <span className="sr-only">{withUnit(readingFigure(balance, (raw) => formatUSDT(raw, language)))}</span>
      {balance.kind === 'error' && <BalanceReadFailed onRetry={onRetry} />}
      {neededRaw !== undefined && (
        <p className="text-body-sm text-ink-2">{t('topup.needed', { amount: formatUSDT(neededRaw, language) })}</p>
      )}
      {funding?.kind === 'short' && (
        <p className="mt-1 font-strong text-orange-ink">
          {t('topup.short', { amount: formatUSDT(funding.shortfallRaw, language) })}
        </p>
      )}
      {funding?.kind === 'enough' && (
        <p className="mt-1 flex items-center gap-1.5 font-strong text-good-ink">
          <Icon name="check" className="size-[17px] stroke-[2.6]" />
          {t('topup.enough')}
        </p>
      )}
      <p className="text-sm text-ink-3">{t('topup.auto')}</p>
    </div>
  );
}
