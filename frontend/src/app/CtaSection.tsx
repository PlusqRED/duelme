'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { Swords } from 'lucide-react';

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <section id="cta" className="relative bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 mb-6">
          <Swords className="h-7 w-7 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('cta.ready')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
          {t('cta.subtitle')}
        </p>
        <div className="mt-8">
          <Link href="/duel/create">
            <Button
              size="lg"
              className="group h-13 px-10 text-base font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all duration-200"
            >
              <Swords className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
              {t('hero.cta')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
