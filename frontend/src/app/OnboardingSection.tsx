'use client';

import { useTranslation } from '@/i18n/useTranslation';
import {
  ArrowDownToLine,
  Chrome,
  Fuel,
  KeyRound,
  ShieldCheck,
  Swords,
  Wallet,
} from 'lucide-react';

const steps = [
  {
    icon: Chrome,
    titleKey: 'onboarding.step1.title' as const,
    descKey: 'onboarding.step1.desc' as const,
    number: '01',
    tone: 'bg-indigo-100 text-indigo-700',
  },
  {
    icon: Wallet,
    titleKey: 'onboarding.step2.title' as const,
    descKey: 'onboarding.step2.desc' as const,
    number: '02',
    tone: 'bg-violet-100 text-violet-700',
  },
  {
    icon: ArrowDownToLine,
    titleKey: 'onboarding.step3.title' as const,
    descKey: 'onboarding.step3.desc' as const,
    number: '03',
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    icon: Swords,
    titleKey: 'onboarding.step4.title' as const,
    descKey: 'onboarding.step4.desc' as const,
    number: '04',
    tone: 'bg-emerald-100 text-emerald-700',
  },
];

const facts = [
  {
    icon: ShieldCheck,
    key: 'onboarding.fact1' as const,
    tone: 'bg-emerald-400/15 text-emerald-200',
  },
  {
    icon: KeyRound,
    key: 'onboarding.fact2' as const,
    tone: 'bg-indigo-400/15 text-indigo-200',
  },
  {
    icon: Wallet,
    key: 'onboarding.fact3' as const,
    tone: 'bg-sky-400/15 text-sky-200',
  },
];

export function OnboardingSection() {
  const { t } = useTranslation();

  return (
    <section id="onboarding" className="relative bg-slate-50 bg-dots py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {t('onboarding.eyebrow')}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {t('onboarding.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            {t('onboarding.subtitle')}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">
                  {t('onboarding.stepsTitle')}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
                  {t('onboarding.stepsSubtitle')}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {steps.map(({ icon: Icon, titleKey, descKey, number, tone }) => (
                <div
                  key={titleKey}
                  className="card-glow rounded-[28px] border border-slate-200 bg-slate-50/80 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {number}
                    </span>
                  </div>
                  <h4 className="mt-4 text-base font-semibold text-slate-950">
                    {t(titleKey)}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {t(descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.8)] sm:p-7">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t('onboarding.sideTitle')}
            </div>
            <div className="mt-5 space-y-4">
              {facts.map(({ icon: Icon, key, tone }) => (
                <div
                  key={key}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">
                    {t(key)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-amber-300/20 bg-amber-400/10 p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-200">
                  <Fuel className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-100">
                    {t('onboarding.gasTitle')}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-amber-50/85">
                    {t('onboarding.gasNote')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
