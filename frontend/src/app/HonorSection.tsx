'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { Shield, Info } from 'lucide-react';

export function HonorSection() {
  const { t } = useTranslation();

  return (
    <section id="honor" className="relative bg-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Shield className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('honor.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            {t('honor.subtitle')}
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {(['honor.rule1', 'honor.rule2', 'honor.rule3'] as const).map((key, i) => (
            <div
              key={key}
              className="card-glow group flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-4 transition-all duration-300 hover:bg-white"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 transition-transform duration-300 group-hover:scale-110">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
                {t(key)}
              </p>
            </div>
          ))}
        </div>

        {/* Safety note */}
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm leading-relaxed text-emerald-800">
            {t('honor.note')}
          </p>
        </div>
      </div>
    </section>
  );
}
