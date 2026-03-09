'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { Swords, Share2, Trophy } from 'lucide-react';

const steps = [
  {
    icon: Swords,
    titleKey: 'howItWorks.step1.title' as const,
    descKey: 'howItWorks.step1.desc' as const,
    color: 'bg-indigo-100 text-indigo-600',
    number: '01',
  },
  {
    icon: Share2,
    titleKey: 'howItWorks.step2.title' as const,
    descKey: 'howItWorks.step2.desc' as const,
    color: 'bg-violet-100 text-violet-600',
    number: '02',
  },
  {
    icon: Trophy,
    titleKey: 'howItWorks.step3.title' as const,
    descKey: 'howItWorks.step3.desc' as const,
    color: 'bg-emerald-100 text-emerald-600',
    number: '03',
  },
];

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-gray-200 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('howItWorks.title')}
        </h2>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="flex flex-col items-center text-center"
              >
                <div className="relative">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${step.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-2 max-w-xs text-sm text-gray-500">
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
