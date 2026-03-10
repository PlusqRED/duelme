'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { UserCheck, Link2, Trophy } from 'lucide-react';

const steps = [
  {
    icon: UserCheck,
    titleKey: 'howItWorks.step1.title' as const,
    descKey: 'howItWorks.step1.desc' as const,
    color: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    number: '01',
  },
  {
    icon: Link2,
    titleKey: 'howItWorks.step2.title' as const,
    descKey: 'howItWorks.step2.desc' as const,
    color: 'bg-violet-100 text-violet-600 border-violet-200',
    number: '02',
  },
  {
    icon: Trophy,
    titleKey: 'howItWorks.step3.title' as const,
    descKey: 'howItWorks.step3.desc' as const,
    color: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    number: '03',
  },
];

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="relative bg-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('howItWorks.title')}
        </h2>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="card-glow group relative flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center transition-all duration-300 hover:bg-white"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden h-px w-8 translate-x-full bg-slate-200 sm:block" />
                )}

                <div className="relative">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${step.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white shadow-sm">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
                  {t(step.descKey)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
