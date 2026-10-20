'use client';

import { usePlatformStats } from '@/hooks/usePlatformStats';
import { useTranslation } from '@/i18n/useTranslation';
import { formatCount, formatVolume } from '@/lib/utils';

/**
 * The platform in three figures under the hero: its fee, the money that went through duels and how
 * many were played. A total the history could not finish reading would be quietly low, so until it
 * is read in full it shows a dash.
 */
export function HeroFacts() {
  const { t, plural, language } = useTranslation();
  const { duelsPlayed, totalVolumeRaw, isLoading, isError } = usePlatformStats();
  const isUnknown = isLoading || isError;

  return (
    <dl className="mt-7 flex flex-wrap gap-x-7 gap-y-2 border-t border-line pt-5 text-body-sm">
      <Fact value="0%" label={t('hero.fees')} />
      <Fact value={isUnknown ? '—' : `${formatVolume(totalVolumeRaw, language)}\u00a0USDT`} label={t('hero.totalVolume')} />
      <Fact value={isUnknown ? '—' : formatCount(duelsPlayed, language)} label={plural('hero.duelsPlayed', duelsPlayed)} />
    </dl>
  );
}

/** One figure and what it counts, the figure first. */
export function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="-order-1 font-extrabold tracking-[-0.01em]">{value}</dd>
    </div>
  );
}
