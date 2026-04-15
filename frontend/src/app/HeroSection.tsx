'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { formatUnits } from 'viem';
import { USDT_DECIMALS } from '@/lib/constants';
import {
  Clock3,
  Coins,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  Wallet,
} from 'lucide-react';

const DEMO_STAKE = '10 USDT';
const DEMO_POT = '20 USDT';

const heroPoints = [
  { icon: Wallet, key: 'hero.point1' as const },
  { icon: LockKeyhole, key: 'hero.point2' as const },
  { icon: Coins, key: 'hero.point3' as const },
];

const heroOutcomes = [
  {
    icon: Trophy,
    titleKey: 'howItWorks.outcomeConfirmed.title' as const,
    summaryKey: 'hero.outcomeConfirmed' as const,
    tone: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700',
  },
  {
    icon: RotateCcw,
    titleKey: 'howItWorks.outcomeDisputed.title' as const,
    summaryKey: 'hero.outcomeDisputed' as const,
    tone: 'border-amber-200/80 bg-amber-50/80 text-amber-700',
  },
  {
    icon: Clock3,
    titleKey: 'howItWorks.outcomeTimeout.title' as const,
    summaryKey: 'hero.outcomeTimeout' as const,
    tone: 'border-sky-200/80 bg-sky-50/80 text-sky-700',
  },
];

function StakeNode({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/82 p-3 text-center shadow-sm backdrop-blur-sm sm:p-4">
      <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        {children}
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {value}
      </div>
    </div>
  );
}

export function HeroSection() {
  const { t, language } = useTranslation();
  const { duelsPlayed, totalVolumeRaw, isLoading } = usePlatformStats();

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const formattedVolume = useMemo(() => {
    const value = Number(formatUnits(totalVolumeRaw, USDT_DECIMALS));

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: value > 0 && value < 100 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  }, [locale, totalVolumeRaw]);

  const formattedDuelsPlayed = useMemo(
    () => new Intl.NumberFormat(locale).format(duelsPlayed),
    [locale, duelsPlayed]
  );

  return (
    <section
      id="hero"
      className="hero-gradient relative overflow-hidden border-b border-slate-200/70"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-200/55 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-0 top-8 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cyan-100/60 blur-3xl sm:h-72 sm:w-72" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 pb-10 pt-10 sm:gap-12 sm:pb-14 sm:pt-14 lg:min-h-[calc(100svh-3.5rem)] lg:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.98fr)] lg:items-center lg:py-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t('hero.badge')}
            </div>

            <h1 className="mt-6 max-w-4xl text-[clamp(2.75rem,6vw,5.2rem)] font-black leading-[0.95] tracking-[-0.04em] text-slate-950 [text-wrap:balance]">
              {t('hero.title1')}
              <br />
              <span className="text-gradient">{t('hero.title2')}</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 [text-wrap:pretty] sm:text-lg">
              {t('hero.subtitle')}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {heroPoints.map(({ icon: Icon, key }) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-white/78 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-sky-700" />
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/duel/create"
                className={buttonVariants({
                  size: 'lg',
                  className:
                    'h-12 rounded-2xl bg-slate-950 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900',
                })}
              >
                <Swords className="mr-2 h-4 w-4" />
                {t('hero.cta')}
              </Link>
              <a
                href="#how-it-works"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'lg',
                  className:
                    'h-12 rounded-2xl border-slate-300 bg-white/72 px-8 text-base font-semibold text-slate-700 backdrop-blur-sm transition-all duration-200 hover:border-slate-400 hover:bg-white',
                })}
              >
                  {t('hero.ctaSecondary')}
              </a>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-500 [text-wrap:pretty]">
              {t('hero.note')}
            </p>

            <div className="mt-8 rounded-[28px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-sm sm:p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-[1.7rem] font-bold tabular-nums text-slate-950">
                    {isLoading ? '$—' : `$${formattedVolume}`}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t('hero.totalVolume')}
                  </div>
                </div>
                <div>
                  <div className="text-[1.7rem] font-bold tabular-nums text-slate-950">
                    {isLoading ? '—' : formattedDuelsPlayed}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t('hero.duelsPlayed')}
                  </div>
                </div>
                <div>
                  <div className="text-[1.7rem] font-bold tabular-nums text-emerald-600">0%</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t('hero.fees')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative animate-soft-in lg:justify-self-end">
            <div className="absolute inset-4 rounded-[36px] bg-gradient-to-br from-blue-200/40 via-white to-emerald-100/55 blur-2xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/82 bg-white/88 p-5 shadow-[0_36px_90px_-42px_rgba(15,23,42,0.38)] backdrop-blur-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                  {t('hero.panelEyebrow')}
                </div>
                <div className="rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t('hero.fees')}: 0%
                </div>
              </div>

              <h2 className="mt-3 max-w-lg text-2xl font-bold tracking-[-0.03em] text-slate-950 [text-wrap:balance] sm:text-[1.9rem]">
                {t('hero.panelTitle')}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 [text-wrap:pretty] sm:text-base">
                {t('hero.panelSubtitle')}
              </p>

              <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.78)_0%,rgba(255,255,255,0.95)_100%)] p-4 sm:p-5">
                <div className="hidden sm:block">
                  <div className="grid grid-cols-[96px_minmax(0,1fr)_148px_minmax(0,1fr)_96px] items-center gap-3">
                    <StakeNode
                      label={t('hero.panelCardPlayer')}
                      value={DEMO_STAKE}
                      tone="bg-sky-100 text-sky-700"
                    >
                      <Wallet className="h-5 w-5" />
                    </StakeNode>

                    <div className="space-y-2">
                      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {DEMO_STAKE}
                      </div>
                      <div className="flow-line-horizontal" />
                    </div>

                    <StakeNode
                      label={t('hero.panelCardContract')}
                      value={DEMO_POT}
                      tone="bg-slate-950 text-white"
                    >
                      <LockKeyhole className="h-5 w-5 animate-float-y" />
                    </StakeNode>

                    <div className="space-y-2 rotate-180">
                      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {DEMO_STAKE}
                      </div>
                      <div className="flow-line-horizontal" />
                    </div>

                    <StakeNode
                      label={t('hero.panelCardOpponent')}
                      value={DEMO_STAKE}
                      tone="bg-emerald-100 text-emerald-700"
                    >
                      <Wallet className="h-5 w-5" />
                    </StakeNode>
                  </div>
                </div>

                <div className="sm:hidden">
                  <div className="grid grid-cols-3 gap-2">
                    <StakeNode
                      label={t('hero.panelCardPlayer')}
                      value={DEMO_STAKE}
                      tone="bg-sky-100 text-sky-700"
                    >
                      <Wallet className="h-5 w-5" />
                    </StakeNode>
                    <StakeNode
                      label={t('hero.panelCardContract')}
                      value={DEMO_POT}
                      tone="bg-slate-950 text-white"
                    >
                      <LockKeyhole className="h-5 w-5 animate-float-y" />
                    </StakeNode>
                    <StakeNode
                      label={t('hero.panelCardOpponent')}
                      value={DEMO_STAKE}
                      tone="bg-emerald-100 text-emerald-700"
                    >
                      <Wallet className="h-5 w-5" />
                    </StakeNode>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {heroOutcomes.map(({ icon: Icon, titleKey, summaryKey, tone }) => (
                    <div
                      key={titleKey}
                      className="rounded-[22px] border border-white/75 bg-white/86 p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${tone}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 text-xs font-semibold leading-snug text-slate-900">
                          {t(titleKey)}
                        </div>
                      </div>
                      <div className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
                        {t(summaryKey)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-slate-500">
                {t('hero.panelFooter')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
