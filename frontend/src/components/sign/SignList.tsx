'use client';

import { Icon } from '@/components/ui/icon';
import type { SignItem } from '@/components/sign/signingModel';
import { useTranslation } from '@/i18n/useTranslation';
import { formatEthFee } from '@/lib/gasNeeds';
import { cn } from '@/lib/utils';

/** A transaction's fee chip: what it should cost, or once it went through, what it cost. */
export interface ItemFee {
  wei: bigint;
  paid: boolean;
}

interface SignListProps {
  items: SignItem[];
  /** The one the wallet is asked for: those before it are ticked off, and only its own line says more. */
  current?: number;
  /** Ticks those before `current` without marking it, as the chain confirms the last one. */
  quiet?: boolean;
  fees?: (ItemFee | null)[];
}

/**
 * What each signature or transaction does, in the order the wallet will ask, and what the wallet
 * will call it. A transaction the wallet pays for carries its fee.
 */
export function SignList({ items, current, quiet = false, fees }: SignListProps) {
  const { t, language } = useTranslation();

  return (
    <ol className="grid gap-2">
      {items.map((item, index) => {
        const isDone = current !== undefined && index < current;
        const isCurrent = current === index && !quiet;
        const fee = fees?.[index] ?? null;
        return (
          <li
            key={item.part}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'grid grid-cols-[30px_minmax(0,1fr)] items-start gap-x-3 rounded-2xl border-[1.5px] border-line px-3.5 py-3 transition-colors duration-300',
              fee && 'gap-y-2',
              isCurrent && 'border-sun-edge bg-sun-soft'
            )}
          >
            <b
              className={cn(
                'grid size-[30px] place-items-center rounded-full bg-canvas-deep text-sm font-extrabold text-ink-2',
                isCurrent && 'bg-sun text-ink',
                isDone && 'animate-pop bg-good text-paper'
              )}
            >
              {isDone ? <Icon name="check" className="size-4 stroke-[2.6]" /> : index + 1}
            </b>
            <div className="min-w-0">
              <strong className="block font-strong leading-[1.3]">{item.text}</strong>
              {(current === undefined || current === index) && (
                <small className="mt-[3px] block text-note leading-[1.4] text-ink-3">{item.sub}</small>
              )}
            </div>
            {fee && (
              <span
                className={cn(
                  'col-start-2 inline-flex h-6 items-center gap-[5px] justify-self-start rounded-full px-[9px] text-xs font-strong tabular-nums',
                  fee.paid ? 'animate-pop bg-good-soft text-good-ink' : isCurrent ? 'bg-paper text-ink-2' : 'bg-canvas text-ink-2'
                )}
              >
                <Icon name={fee.paid ? 'check' : 'fuel'} className="size-[13px]" />
                {t(fee.paid ? 'sign.fee.paid' : 'sign.fee.about', { eth: formatEthFee(fee.wei, language) })}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
