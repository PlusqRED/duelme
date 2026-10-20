'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { SafeLock } from '@/components/arena/SafeLock';
import { GainRing } from '@/components/header/GainRing';
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
  /**
   * The entrance, as the menu opens on news: the lock opens, the money drops in one duel after
   * another and is counted, and a win's Take glints once the last of it has landed.
   */
  isEntering: boolean;
  /** Take leads to the dashboard's safe, out of the menu. */
  onLeave: () => void;
}

/**
 * The money the contract keeps for you, a small copy of the dashboard's safe: the sum, a bar per
 * duel as wide as its share — a win in the payout's sun, a stake in its seat's colour — and Take,
 * which leads to the dashboard, where it is collected.
 */
export function SafeMini({ owed, isEntering, onLeave }: SafeMiniProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    // Below 400px four bars no longer fit beside Take, so each gets a row of its own.
    <div
      role="group"
      aria-labelledby={titleId}
      className="mb-1 grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] bg-ink p-3.5 text-paper shadow-safe [grid-template-areas:'lock_title_sum'_'bars_bars_take'] max-2xs:gap-y-1 max-2xs:[grid-template-areas:'lock_title_title'_'lock_sum_sum'_'bars_bars_bars'_'take_take_take']"
    >
      <SafeLock isOpening={isEntering} className="[grid-area:lock]" />
      <h3 id={titleId} className="text-body-sm/[1.25] font-bold text-paper/86 [grid-area:title]">
        {t('wallet.waiting')}
      </h3>
      <p className="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums [grid-area:sum]">
        <SafeSum totalRaw={owed.totalRaw} isEntering={isEntering} className={cn(owed.hasWin && 'text-sun')} />
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
        href="/dashboard#collect"
        onClick={onLeave}
        className={cn(
          buttonVariants({ variant: owed.hasWin ? 'sun' : 'paperOnNavy', size: 'sm' }),
          'relative [grid-area:take] max-2xs:mt-2'
        )}
      >
        <Icon name={owed.hasWin ? 'trophy' : 'wallet'} className="size-[18px]" />
        {t('wallet.waiting.take')}
        {isEntering && owed.hasWin && <GainRing className="-inset-1 rounded-full ring-sun/50 [animation-delay:850ms]" />}
      </Link>
    </div>
  );
}

/** The sum, counted up from nothing once the lock has opened when the safe enters. */
function SafeSum({ totalRaw, isEntering, className }: { totalRaw: bigint; isEntering: boolean; className?: string }) {
  const { language } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [isCounting, setIsCounting] = useState(!isEntering || reducedMotion);
  const shown = useCountUp(isCounting ? totalRaw : 0n) ?? totalRaw;

  useEffect(() => {
    if (isCounting) {
      return;
    }
    const timer = setTimeout(() => setIsCounting(true), COUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCounting]);

  return <b className={cn('text-figure/none font-extrabold tracking-[-0.03em]', className)}>{formatUSDT(shown, language)}</b>;
}

function SafeBar({ bar, totalRaw, index, isDropping }: { bar: OwedBar; totalRaw: bigint; index: number; isDropping: boolean }) {
  const { language } = useTranslation();
  const raw = bar.kind === 'duel' ? bar.item.raw : bar.raw;
  // As wide as its share, but never too narrow for its figure.
  const weight = Number(raw > totalRaw / 8n ? raw : totalRaw / 8n);
  const tone = bar.kind === 'more' ? 'more' : bar.item.kind === 'win' ? 'win' : bar.item.seat;

  return (
    <span
      data-tone={tone}
      style={{ '--i': index, '--weight': weight }}
      className={cn(
        'grid h-8 min-w-10 shrink grow-(--weight) basis-0 place-items-center overflow-hidden rounded-lg bg-red px-1 text-note font-strong whitespace-nowrap text-paper tabular-nums inset-shadow-stake',
        'data-[tone=more]:bg-paper data-[tone=more]:text-ink data-[tone=opponent]:bg-blue data-[tone=win]:bg-sun data-[tone=win]:text-ink data-[tone=win]:inset-shadow-sun-ink/25',
        isDropping && 'animate-bar-drop [animation-delay:calc(240ms+var(--i)*110ms)]'
      )}
    >
      {bar.kind === 'more' ? `+${bar.count}` : formatUSDT(raw, language)}
    </span>
  );
}
