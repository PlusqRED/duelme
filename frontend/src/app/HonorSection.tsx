'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { Flag, RotateCcw, ShieldCheck } from 'lucide-react';

const rules = [
  {
    icon: Flag,
    titleKey: 'honor.rule1.title' as const,
    descKey: 'honor.rule1.desc' as const,
    tone: 'bg-indigo-100 text-indigo-700',
  },
  {
    icon: ShieldCheck,
    titleKey: 'honor.rule2.title' as const,
    descKey: 'honor.rule2.desc' as const,
    tone: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: RotateCcw,
    titleKey: 'honor.rule3.title' as const,
    descKey: 'honor.rule3.desc' as const,
    tone: 'bg-amber-100 text-amber-700',
  },
];

export function HonorSection() {
  const { t } = useTranslation();

  return (
    <section id="honor" className="relative bg-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {t('honor.eyebrow')}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {t('honor.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            {t('honor.subtitle')}
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {rules.map(({ icon: Icon, titleKey, descKey, tone }) => (
            <div
              key={titleKey}
              className="card-glow rounded-[28px] border border-slate-200 bg-slate-50/80 p-6"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">
                {t(titleKey)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-5">
          <p className="text-sm leading-relaxed text-emerald-900 sm:text-base">
            {t('honor.note')}
          </p>
        </div>
      </div>
    </section>
  );
}
