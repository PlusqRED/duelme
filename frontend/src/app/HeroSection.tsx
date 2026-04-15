'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { formatUnits } from 'viem';
import { USDT_DECIMALS } from '@/lib/constants';
import {
  Coins,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Swords,
  Wallet,
} from 'lucide-react';

const heroPoints = [
  { icon: Wallet, key: 'hero.point1' as const },
  { icon: LockKeyhole, key: 'hero.point2' as const },
  { icon: Coins, key: 'hero.point3' as const },
];

const safetySteps = [
  {
    icon: Wallet,
    titleKey: 'hero.panelStep1.title' as const,
    descKey: 'hero.panelStep1.desc' as const,
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    icon: LockKeyhole,
    titleKey: 'hero.panelStep2.title' as const,
    descKey: 'hero.panelStep2.desc' as const,
    tone: 'bg-indigo-100 text-indigo-700',
  },
  {
    icon: ShieldCheck,
    titleKey: 'hero.panelStep3.title' as const,
    descKey: 'hero.panelStep3.desc' as const,
    tone: 'bg-emerald-100 text-emerald-700',
  },
];

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
    <section id="hero" className="hero-gradient relative overflow-hidden border-b border-indigo-100/70">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-indigo-200/60 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-sky-100/70 blur-3xl sm:h-72 sm:w-72" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t('hero.badge')}
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {t('hero.title1')}
              <br />
              <span className="text-gradient">{t('hero.title2')}</span>
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              {t('hero.subtitle')}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {heroPoints.map(({ icon: Icon, key }) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-indigo-600" />
                  {t(key)}
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/duel/create">
                <Button
                  size="lg"
                  className="h-13 rounded-2xl bg-slate-950 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900"
                >
                  <Swords className="mr-2 h-4 w-4" />
                  {t('hero.cta')}
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 rounded-2xl border-slate-300 bg-white/70 px-8 text-base font-semibold text-slate-700 backdrop-blur-sm transition-all duration-200 hover:border-slate-400 hover:bg-white"
                >
                  {t('hero.ctaSecondary')}
                </Button>
              </a>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              {t('hero.note')}
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-bold text-slate-950">
                  {isLoading ? '$—' : `$${formattedVolume}`}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {t('hero.totalVolume')}
                </div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-bold text-slate-950">
                  {isLoading ? '—' : formattedDuelsPlayed}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {t('hero.duelsPlayed')}
                </div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-bold text-emerald-600">0%</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {t('hero.fees')}
                </div>
              </div>
            </div>
          </div>

          <div className="relative animate-soft-in">
            <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-indigo-200/50 via-white to-emerald-100/50 blur-2xl" />
            <div className="relative rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_32px_80px_-36px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-7">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                {t('hero.panelEyebrow')}
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                {t('hero.panelTitle')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                {t('hero.panelSubtitle')}
              </p>

              <div className="mt-6 space-y-3">
                {safetySteps.map(({ icon: Icon, titleKey, descKey, tone }) => (
                  <div
                    key={titleKey}
                    className="flex gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {t(titleKey)}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        {t(descKey)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[28px] bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <span>{t('hero.panelCardLabel')}</span>
                  <span>{t('hero.fees')}: 0%</span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-400/15">
                      <Wallet className="h-5 w-5 text-indigo-200" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-300">
                      {t('hero.panelCardPlayer')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">10 USDT</p>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/15">
                      <LockKeyhole className="h-5 w-5 text-emerald-200" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-emerald-100">
                      {t('hero.panelCardContract')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">20 USDT</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-violet-400/15">
                      <Wallet className="h-5 w-5 text-violet-200" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-300">
                      {t('hero.panelCardOpponent')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">10 USDT</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  {t('hero.panelFooter')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
