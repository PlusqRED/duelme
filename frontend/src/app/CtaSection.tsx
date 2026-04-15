'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { ShieldCheck, Swords } from 'lucide-react';

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <section
      id="cta"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_100%)] py-16 sm:py-24"
    >
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-8 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-[36px] border border-white/80 bg-white/85 px-6 py-10 text-center shadow-[0_24px_70px_-40px_rgba(15,23,42,0.4)] backdrop-blur-sm sm:px-10 sm:py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Swords className="h-7 w-7" />
          </div>

          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-black tracking-tight text-slate-950 [text-wrap:balance] sm:text-4xl">
            {t('cta.ready')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 [text-wrap:pretty] sm:text-lg">
            {t('cta.subtitle')}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            {t('cta.note')}
          </div>

          <div className="mt-8">
            <Link
              href="/duel/create"
              className={buttonVariants({
                size: 'lg',
                className:
                  'h-12 rounded-2xl bg-slate-950 px-10 text-base font-semibold text-white shadow-lg shadow-slate-300/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900',
              })}
            >
              <Swords className="mr-2 h-4 w-4" />
              {t('hero.cta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
