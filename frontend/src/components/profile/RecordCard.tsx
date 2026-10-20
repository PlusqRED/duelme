'use client';

import { useId } from 'react';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { usePlayerTotals } from '@/hooks/usePlayerTotals';
import { useTranslation } from '@/i18n/useTranslation';
import { cn, formatCount, formatUSDT } from '@/lib/utils';

/**
 * A player's duels in figures: wins and losses as a scoreboard, the wins in the winner's sun, and
 * the money they put into duels and took out of them.
 */
export function RecordCard({ address }: { address: `0x${string}` }) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const { totals, isLoading, isError, retry } = usePlayerTotals(address);
  const { wins, losses } = totals;
  const show = (value: string) => (isLoading ? '—' : value);

  return (
    <section aria-labelledby={titleId} className="grid content-start gap-4 rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,28px)]">
      <h2 id={titleId} className="text-xl">
        {t('profile.record.title')}
      </h2>
      <PartialDataNotice when={isError} onRetry={() => void retry()} />
      <div
        role="img"
        aria-label={`${t('profile.record.wins')} ${wins}, ${t('profile.record.losses')} ${losses}`}
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 rounded-[18px] bg-canvas p-3"
      >
        <Side icon="trophy" figure={show(formatCount(wins, language))} label={t('profile.record.wins')} isWon />
        <span className="text-2xl font-extrabold text-ink-3">:</span>
        <Side icon="flag" figure={show(formatCount(losses, language))} label={t('profile.record.losses')} />
      </div>
      <dl className="grid">
        <Line label={t('profile.record.staked')} value={show(`${formatUSDT(totals.stakedRaw, language)} USDT`)} />
        <Line label={t('profile.record.takenOut')} value={show(`${formatUSDT(totals.takenRaw, language)} USDT`)} />
      </dl>
    </section>
  );
}

interface SideProps {
  icon: IconName;
  figure: string;
  label: string;
  isWon?: boolean;
}

function Side({ icon, figure, label, isWon = false }: SideProps) {
  return (
    <span
      className={cn(
        'grid justify-items-center gap-0.5 rounded-[14px] px-1.5 pt-2 pb-2.5',
        isWon ? 'bg-sun text-ink inset-shadow-[0_-4px_0_var(--color-sun-edge)]' : 'bg-paper text-ink-2'
      )}
    >
      <Icon name={icon} className="size-[18px]" />
      <b className="text-[2rem]/[1.05] font-extrabold tracking-[-0.03em] text-ink tabular-nums">{figure}</b>
      <small className="text-sm font-label">{label}</small>
    </span>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 not-first:border-t not-first:border-line">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-strong tabular-nums">{value}</dd>
    </div>
  );
}
