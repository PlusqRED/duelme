'use client';

import type { Hex } from 'viem';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';
import { explorerLink } from '@/lib/explorer';
import { cn, truncateAddress } from '@/lib/utils';

export interface Tick {
  text: string;
  status: 'done' | 'busy' | 'next';
}

/** The chain at work, ticked off: what is done, what is under way, what comes next. */
export function SignTicks({ ticks }: { ticks: Tick[] }) {
  return (
    <ol aria-live="polite" className="grid gap-2.5">
      {ticks.map((tick) => (
        <li
          key={tick.text}
          data-status={tick.status}
          className={cn('flex items-center gap-2.5 font-label', tick.status === 'next' ? 'text-ink-3' : 'text-ink')}
        >
          {tick.status === 'done' ? (
            <Icon name="check" className="size-[22px] flex-none animate-pop stroke-[2.6] text-good" />
          ) : tick.status === 'busy' ? (
            <Spinner className="m-0.5" />
          ) : (
            <i aria-hidden="true" className="m-0.5 size-[18px] flex-none rounded-full shadow-[inset_0_0_0_2px_var(--color-line-strong)]" />
          )}
          <span>{tick.text}</span>
        </li>
      ))}
    </ol>
  );
}

/** The transaction on the explorer, once there is one, in a new tab. */
export function TxLink({ chainId, hash }: { chainId: number; hash: Hex }) {
  const { t } = useTranslation();
  const href = explorerLink(chainId, 'tx', hash);
  if (!href) {
    return null;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 animate-swap items-center gap-2 justify-self-start font-label text-blue-deep no-underline"
    >
      <span className="text-ink-3 tabular-nums">{truncateAddress(hash)}</span>
      <span>{t('send.tx')}</span>
      <Icon name="external" className="size-4" />
    </a>
  );
}
