'use client';

import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';

interface BalanceReadFailedProps {
  /** Reads the balance again. Never a signature or a transaction. */
  onRetry: () => void;
}

/** A balance that could not be read, said as that rather than as a zero, with a way to read it again. */
export function BalanceReadFailed({ onRetry }: BalanceReadFailedProps) {
  const { t } = useTranslation();

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm font-label text-orange-ink">
      <Icon name="alert" className="size-4" />
      {t('wallet.balanceFailed')}
      <button type="button" onClick={onRetry} className="min-h-11 cursor-pointer underline underline-offset-4">
        {t('action.tryAgain')}
      </button>
    </p>
  );
}
