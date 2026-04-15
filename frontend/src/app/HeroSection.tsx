'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { formatUnits } from 'viem';
import { USDT_DECIMALS } from '@/lib/constants';
import { Coins, LockKeyhole, Sparkles, Swords, Wallet } from 'lucide-react';

const heroPoints = [
  { icon: Wallet, key: 'hero.point1' as const },
  { icon: LockKeyhole, key: 'hero.point2' as const },
  { icon: Coins, key: 'hero.point3' as const },
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
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center pb-10 pt-10 text-center sm:pb-14 sm:pt-14 lg:min-h-[calc(100svh-3.5rem)] lg:py-16">
          <div className="w-full max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t('hero.badge')}
            </div>

            <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.75rem,6vw,5.2rem)] font-black leading-[0.95] tracking-[-0.04em] text-slate-950 [text-wrap:balance]">
              {t('hero.title1')}
              <br />
              <span className="text-gradient">{t('hero.title2')}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 [text-wrap:pretty] sm:text-lg">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 grid w-full gap-3 md:grid-cols-3">
              {heroPoints.map(({ icon: Icon, key }) => (
                <div
                  key={key}
                  className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full border border-white/85 bg-white/78 px-5 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-sky-700" />
                  <span className="[text-wrap:balance]">{t(key)}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
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

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500 [text-wrap:pretty]">
              {t('hero.note')}
            </p>

            <div className="mt-10 w-full rounded-[28px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-sm sm:p-5">
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
        </div>
      </div>
    </section>
  );
}
