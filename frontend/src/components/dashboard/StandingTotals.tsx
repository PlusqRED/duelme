'use client';

import { useRef } from 'react';
import { CountedUsdt } from '@/components/arena/CountedUsdt';
import { OUTCOME_LOOKS } from '@/components/dashboard/HistoryRow';
import { Icon } from '@/components/ui/icon';
import { useCountTo } from '@/hooks/useCountTo';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { MyTotals } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

/** As long as the scale's pin takes to walk, about. */
const COUNT_MS = 700;

/**
 * The reader's totals: wins and losses as a scoreboard, theirs in the sun and the losses quiet, then
 * what they have staked and taken out. The figures count up from zero the first time they are seen.
 */
export function StandingTotals({ totals }: { totals: MyTotals }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isSeen = useSeenOnce(ref, 0.3);
  const wins = Math.round(useCountTo(totals.wins, isSeen, { durationMs: COUNT_MS }));
  const losses = Math.round(useCountTo(totals.losses, isSeen, { durationMs: COUNT_MS }));
  const isCounting = isSeen || reducedMotion;

  return (
    <div ref={ref} className="grid content-start gap-3 border-t border-line pt-4">
      <h3 className="text-base font-strong">{t('dash.totals')}</h3>
      <div
        role="img"
        aria-label={`${t('dashboard.wins')} ${totals.wins}, ${t('dashboard.losses')} ${totals.losses}`}
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 rounded-[18px] bg-canvas p-3"
      >
        <Score isWin count={wins} label="dashboard.wins" />
        <span className="text-2xl font-extrabold text-ink-3">:</span>
        <Score isWin={false} count={losses} label="dashboard.losses" />
      </div>
      <dl className="grid">
        <Figure label={t('dash.staked')} raw={isCounting ? totals.stakedRaw : 0n} />
        <Figure label={t('dash.taken')} raw={isCounting ? totals.takenRaw : 0n} />
      </dl>
    </div>
  );
}

function Score({ isWin, count, label }: { isWin: boolean; count: number; label: TranslationKey }) {
  const { t } = useTranslation();
  const look = OUTCOME_LOOKS[isWin ? 'won' : 'lost'];

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid justify-items-center gap-0.5 rounded-[14px] bg-paper px-1.5 pt-2 pb-2.5 text-ink-2',
        isWin && 'bg-sun text-ink inset-shadow-[0_-4px_0_var(--color-sun-edge)]'
      )}
    >
      <Icon name={look.icon} className="size-[18px]" />
      <b className="text-[2rem]/[1.05] font-extrabold tracking-[-0.03em] text-ink tabular-nums">{count}</b>
      <small className="text-note font-label">{t(label)}</small>
    </span>
  );
}

function Figure({ label, raw }: { label: string; raw: bigint }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[9px] not-first:border-t not-first:border-line">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-strong whitespace-nowrap tabular-nums">
        <CountedUsdt raw={raw} />
        {' '}USDT
      </dd>
    </div>
  );
}
