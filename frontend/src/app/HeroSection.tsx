'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { Swords, Shield, Zap } from 'lucide-react';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section id="hero" className="hero-gradient relative overflow-hidden">
      {/* Animated background dots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 top-20 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-violet-200/20 blur-3xl animate-pulse-slow animation-delay-2000" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6 animate-fade-in rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 backdrop-blur-sm">
            <span className="text-xs font-medium text-indigo-700 sm:text-sm">
              {t('hero.badge')}
            </span>
          </div>

          {/* Icon row */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 shadow-sm animate-fade-in-up">
              <Swords className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 shadow-sm animate-fade-in-up animation-delay-100">
              <Shield className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 shadow-sm animate-fade-in-up animation-delay-200">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 animate-fade-in-up animation-delay-300 sm:text-5xl lg:text-6xl">
            {t('hero.title1')}
            <br />
            <span className="text-gradient">{t('hero.title2')}</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 animate-fade-in-up animation-delay-400 sm:mt-6 sm:text-xl">
            {t('hero.subtitle')}
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col gap-3 animate-fade-in-up animation-delay-500 sm:flex-row">
            <Link href="/duel/create">
              <Button
                size="lg"
                className="group h-13 px-8 text-base font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all duration-200"
              >
                <Swords className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                {t('hero.cta')}
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 text-base font-semibold border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400 transition-all duration-200"
              >
                {t('hero.ctaSecondary')}
              </Button>
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-14 flex items-center gap-8 animate-fade-in-up animation-delay-600 sm:gap-12">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-900">$0</span>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Total Volume
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-900">0</span>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Duels Played
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-emerald-600">0%</span>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Fees
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
