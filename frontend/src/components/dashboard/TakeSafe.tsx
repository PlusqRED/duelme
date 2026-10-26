'use client';

import { useEffect, useRef, useState } from 'react';
import { CountedUsdt } from '@/components/arena/CountedUsdt';
import { SafeLock } from '@/components/arena/SafeLock';
import { Stake } from '@/components/arena/Stake';
import { GainRing } from '@/components/header/GainRing';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import type { DuelGame } from '@/hooks/useDashboard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { NO_WINNER_REASONS, otherOf, reportedWin, type MyDuel } from '@/lib/dashboard';
import type { Owed, OwedItem } from '@/lib/owed';
import { cn, formatUSDT } from '@/lib/utils';

/** The sum starts counting once the lock has opened. */
const COUNT_DELAY_MS = 250;

interface TakeSafeProps {
  owed: Owed;
  entryById: ReadonlyMap<number, MyDuel>;
  gameOf: (duelId: number) => DuelGame | null;
  nameOf: (address: string) => string;
  onTake: () => void;
  /** The signing window is open, so Take waits. */
  isBusy: boolean;
}

/**
 * The money the contract keeps for the reader, shaped as its safe: the page's one loud element. A
 * bar per duel in the arena's colours (the sun for a win, the seat's colour for a stake going back)
 * says what each one is, a timed-out stake also what closing it does to both records, and one Take
 * empties it all. The first time it is seen, the lock opens, the money drops in duel by duel while
 * the sum counts, and a win's Take glints once.
 */
export function TakeSafe({ owed, entryById, gameOf, nameOf, onTake, isBusy }: TakeSafeProps) {
  const { t, language } = useTranslation();
  const { isRelayEnabled } = useRelayerStatus(DEFAULT_CHAIN_ID);
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const isSeen = useSeenOnce(ref, 0.3);
  const isEntering = isSeen && !reducedMotion;
  const [isCounting, setIsCounting] = useState(reducedMotion);
  const total = formatUSDT(owed.totalRaw, language);

  useEffect(() => {
    if (!isSeen || isCounting) return;
    const timer = setTimeout(() => setIsCounting(true), COUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isSeen, isCounting]);

  return (
    <section
      ref={ref}
      id="collect"
      aria-labelledby="collect-title"
      className="relative grid scroll-mt-28 gap-[18px] rounded-[28px] bg-ink p-[clamp(20px,3vw,28px)] text-paper shadow-[0_6px_0_var(--color-ink-edge),var(--shadow-stage)]"
    >
      <SafeLock isOpening={isEntering} className="absolute -top-5 left-[clamp(20px,3vw,28px)] border-2 border-ink" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5">
        <div className="grid flex-[1_1_280px] gap-1">
          <h2 id="collect-title" className="text-lead tracking-[-0.02em]">
            {t('wallet.waiting')}
          </h2>
          <p className="max-w-[52ch] text-body-sm text-paper/72">{t('dash.tray.text')}</p>
        </div>
        <p className="inline-flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
          <b className={cn('text-[clamp(2rem,1.6rem+1.4vw,2.75rem)] leading-none font-extrabold tracking-[-0.035em]', owed.hasWin && 'text-sun')}>
            <CountedUsdt raw={isCounting ? owed.totalRaw : 0n} />
          </b>
          <small className="text-sm font-label opacity-70">USDT</small>
        </p>
      </div>
      <ul className="grid gap-1.5 rounded-[18px] bg-paper/7 p-1.5 ring-1 ring-paper/12 ring-inset">
        {owed.items.map((item, index) => {
          const entry = entryById.get(item.duelId);
          return entry && <OwedRow key={item.duelId} item={item} entry={entry} game={gameOf(item.duelId)} nameOf={nameOf} index={index} isDropping={isEntering} isWaiting={!isSeen && !reducedMotion} />;
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
        <Button
          variant={owed.hasWin ? 'sun' : 'paperOnNavy'}
          size="lg"
          onClick={onTake}
          disabled={isBusy}
          className="relative max-xs:flex-[1_1_100%]"
        >
          <Icon name={owed.hasWin ? 'trophy' : 'wallet'} />
          {t('dash.tray.take', { amount: total })}
          {isEntering && owed.hasWin && <GainRing className="-inset-1 rounded-full ring-sun/50 [animation-delay:900ms]" />}
        </Button>
        <p className="flex-[1_1_220px] text-sm text-paper/72">{t(isRelayEnabled ? 'dash.tray.one' : 'dash.tray.one.self')}</p>
      </div>
    </section>
  );
}

interface OwedRowProps {
  item: OwedItem;
  entry: MyDuel;
  game: DuelGame | null;
  nameOf: (address: string) => string;
  index: number;
  isDropping: boolean;
  /** Not seen yet: the bar waits out of sight to drop in. */
  isWaiting: boolean;
}

/** One duel's money in the safe: its bar, what it is, and for a stake coming back, why. */
function OwedRow({ item, entry, game, nameOf, index, isDropping, isWaiting }: OwedRowProps) {
  const { t, language } = useTranslation();
  const id = item.duelId;
  const other = otherOf(entry);
  const reason = NO_WINNER_REASONS[entry.phase];

  return (
    <li className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-3.5 rounded-[13px] py-2 pr-3 pl-2 not-first:border-t not-first:border-paper/8 max-xs:grid-cols-[64px_minmax(0,1fr)] max-xs:gap-3">
      <Stake
        side={item.seat}
        isPrize={item.kind === 'win'}
        style={{ '--i': index }}
        className={cn('h-11 px-1.5 text-base', isWaiting && 'opacity-0', isDropping && 'animate-bar-drop [animation-delay:calc(var(--i)*120ms+260ms)]')}
      >
        {formatUSDT(item.raw, language)}
      </Stake>
      <div className="grid min-w-0 gap-0.5">
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <b className="font-strong">{t(item.kind === 'win' ? 'dash.tray.win' : 'dash.tray.back')}</b>
          <LocaleLink
            href={`/duel/${id}`}
            className="text-body-sm text-paper/86 underline decoration-paper/35 underline-offset-4 hover:text-paper hover:decoration-current"
          >
            {game ? t('dash.tray.duel', { game: game.name, id }) : t('duel.title', { id })}
          </LocaleLink>
        </p>
        {item.kind !== 'win' && reason && <p className="text-sm text-paper/66">{t(reason, { other: other ? nameOf(other) : '' })}</p>}
        {item.kind === 'late' && (
          <p className="text-sm text-paper/82">
            {reportedWin(entry) ? t('dash.tray.late.honored', { other: other ? nameOf(other) : '' }) : t('dash.tray.late.abandoned')}
          </p>
        )}
      </div>
    </li>
  );
}
