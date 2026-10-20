'use client';

import { Icon } from '@/components/ui/icon';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, truncateAddress } from '@/lib/utils';

interface CopyAddressProps {
  address: string;
  /** Written out whole, where the shortened form is already the name above it. */
  isFull?: boolean;
}

/** A wallet address, shortened unless asked, with the button that copies it whole and says when it did. */
export function CopyAddress({ address, isFull = false }: CopyAddressProps) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback('wallet.copyFailed');

  return (
    <span className="inline-flex max-w-full items-center gap-0.5">
      <span title={address} className={cn('font-strong text-ink-2 tabular-nums', isFull && 'text-sm [overflow-wrap:anywhere]')}>
        {isFull ? address : truncateAddress(address)}
      </span>
      <button
        type="button"
        onClick={() => void copy(address)}
        aria-label={copied ? undefined : t('wallet.copyAddress')}
        className={cn(
          'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-[5px] rounded-full px-2.5 text-note font-strong transition-colors',
          copied ? 'bg-good-soft text-good-ink' : 'text-ink-3 hover:bg-paper hover:text-ink'
        )}
      >
        <Icon name={copied ? 'check' : 'copy'} className={cn('size-4', copied && 'animate-pop stroke-[2.6]')} />
        {copied && t('wallet.copied')}
      </button>
    </span>
  );
}
