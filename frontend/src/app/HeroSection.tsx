'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { Swords, Shield, Zap } from 'lucide-react';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <div className="flex flex-col items-center text-center">
          {/* Icon row */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Swords className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <Shield className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>

          {/* Subtitle */}
          <p className="mt-4 max-w-xl text-lg text-gray-600 sm:mt-6 sm:text-xl">
            {t('hero.subtitle')}
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/duel/create">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Swords className="mr-2 h-4 w-4" />
                {t('hero.cta')}
              </Button>
            </Link>
            <a href="#recent-duels">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold border-gray-300 text-gray-700"
              >
                {t('hero.recentDuels')}
              </Button>
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-12 flex items-center gap-8 sm:gap-12">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">$0</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Total Volume
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">0</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Duels Played
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">2</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Chains
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
