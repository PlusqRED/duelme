'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCountUp } from '@/hooks/useCountUp';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/useTranslation';
import { owedBars, type Owed, type OwedBar } from '@/lib/owed';
import { cn, formatUSDT } from '@/lib/utils';

/** The window shows one bar per duel up to this many; the rest share the last bar. */
const MAX_BARS = 4;
/** The sum starts counting once the lock has opened. */
const COUNT_DELAY_MS = 260;

interface SafeMiniProps {
  owed: Owed;
  /** Open the safe, drop its money in and count it, as the menu opens on news. */
  isEntering: boolean;
  /** Take leads to the dashboard, out of the menu. */
  onLeave: () => void;
}

/**
 * The money the contract keeps for you, a small copy of the dashboard's safe: the sum, a bar per
 * duel as wide as its share — a win in the payout's sun, a stake in its seat's colour — and Take,
 * which leads to the dashboard, where it is collected.
 */
export function SafeMini({ owed, isEntering, onLeave }: SafeMiniProps) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const sum = useEntranceCount(owed.totalRaw, isEntering);

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="mb-1 grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] bg-ink p-3.5 text-paper shadow-[0_5px_0_var(--color-ink-edge)] [grid-template-areas:'lock_title_sum'_'bars_bars_take'] max-2xs:gap-y-1 max-2xs:[grid-template-areas:'lock_title_title'_'lock_sum_sum'_'bars_bars_take']"
    >
      <SafeLock isOpening={isEntering} />
      <h3 id={titleId} className="text-body-sm/[1.25] font-bold text-paper/86 [grid-area:title]">
        {t('wallet.waiting')}
      </h3>
      <p className="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums [grid-area:sum]">
        <b className={cn('text-figure/none font-extrabold tracking-[-0.03em]', owed.hasWin && 'text-sun')}>
          {formatUSDT(sum, language)}
        </b>
        <small className="text-xs font-label opacity-70">USDT</small>
      </p>
      <span
        aria-hidden="true"
        className="flex min-w-0 gap-1 rounded-xl bg-paper/7 p-1 ring-1 ring-paper/12 ring-inset [grid-area:bars] max-2xs:mt-2"
      >
        {owedBars(owed.items, MAX_BARS).map((bar, index) => (
          <SafeBar key={bar.kind === 'duel' ? bar.item.duelId : 'more'} bar={bar} totalRaw={owed.totalRaw} index={index} isDropping={isEntering} />
        ))}
      </span>
      <Link
        href="/dashboard"
        onClick={onLeave}
        className={cn(
          buttonVariants({ variant: owed.hasWin ? 'sun' : 'paper', size: 'sm' }),
          'relative [grid-area:take] max-2xs:mt-2',
          !owed.hasWin && '[--keycap-edge:var(--color-ink-edge)]'
        )}
      >
        <Icon name={owed.hasWin ? 'trophy' : 'wallet'} className="size-[18px]" />
        {t('wallet.waiting.take')}
        {isEntering && owed.hasWin && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 animate-gain-ring rounded-full opacity-0 ring-4 ring-sun/50 [animation-delay:850ms]"
          />
        )}
      </Link>
    </div>
  );
}

/** The sum, counted up from nothing once the lock has opened when the safe enters. */
function useEntranceCount(totalRaw: bigint, isEntering: boolean): bigint {
  const reducedMotion = useReducedMotion();
  const [isCounting, setIsCounting] = useState(!isEntering || reducedMotion);

  useEffect(() => {
    if (isCounting) {
      return;
    }
    const timer = setTimeout(() => setIsCounting(true), COUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCounting]);

  return useCountUp(isCounting ? totalRaw : 0n) ?? totalRaw;
}

const SEAT_TONE = { creator: 'bg-red text-paper', opponent: 'bg-blue text-paper' } as const;

function SafeBar({ bar, totalRaw, index, isDropping }: { bar: OwedBar; totalRaw: bigint; index: number; isDropping: boolean }) {
  const { language } = useTranslation();
  const raw = bar.kind === 'duel' ? bar.item.raw : bar.raw;
  // As wide as its share, but never too narrow for its figure.
  const weight = Number(raw > totalRaw / 8n ? raw : totalRaw / 8n);

  return (
    <span
      style={{ flexGrow: weight, animationDelay: isDropping ? `${index * 110 + 240}ms` : undefined }}
      className={cn(
        'grid h-8 min-w-10 shrink basis-0 place-items-center overflow-hidden rounded-lg px-1 text-note font-strong whitespace-nowrap tabular-nums inset-shadow-stake',
        bar.kind === 'more'
          ? 'bg-paper text-ink'
          : bar.item.kind === 'win'
            ? 'bg-sun text-ink inset-shadow-sun-ink/25'
            : SEAT_TONE[bar.item.seat],
        isDropping && 'animate-bar-drop'
      )}
    >
      {bar.kind === 'more' ? `+${bar.count}` : formatUSDT(raw, language)}
    </span>
  );
}

/** The safe's lock, its shackle raised: open, since the money in it is yours to take. */
function SafeLock({ isOpening }: { isOpening: boolean }) {
  return (
    <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-paper text-ink [grid-area:lock]">
      <svg
        viewBox="0 0 24 24"
        className="size-[22px] overflow-visible fill-none stroke-current stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" className={cn('-translate-y-[3.5px]', isOpening && 'animate-unlock')} />
        <rect x="5.5" y="11" width="13" height="9.5" rx="2.5" />
        <path d="M12 14.6v2.4" />
      </svg>
    </span>
  );
}
