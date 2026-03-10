'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { Chrome, Wallet, ArrowDownToLine, Fuel, ArrowUpFromLine } from 'lucide-react';

const steps = [
  { icon: Chrome, key: 'onboarding.step1' as const, color: 'bg-indigo-600' },
  { icon: Wallet, key: 'onboarding.step2' as const, color: 'bg-violet-600' },
  { icon: ArrowDownToLine, key: 'onboarding.step3' as const, color: 'bg-blue-600' },
  { icon: Fuel, key: 'onboarding.step4' as const, color: 'bg-amber-600' },
  { icon: ArrowUpFromLine, key: 'onboarding.step5' as const, color: 'bg-emerald-600' },
];

export function OnboardingSection() {
  const { t } = useTranslation();

  return (
    <section id="onboarding" className="relative bg-slate-50 bg-dots py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('onboarding.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            {t('onboarding.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl">
          <div className="relative flex flex-col gap-0">
            {/* Vertical line */}
            <div className="absolute left-5 top-6 bottom-6 w-px bg-slate-200 sm:left-6" />

            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="group relative flex items-start gap-4 py-4 sm:gap-5">
                  {/* Circle */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${step.color} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {/* Text */}
                  <div className="flex-1 pt-2">
                    <p className="text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                      {t(step.key)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gas note */}
          <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Fuel className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              {t('onboarding.gasNote')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
