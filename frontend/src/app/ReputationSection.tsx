'use client';

import { useTranslation } from '@/i18n/useTranslation';
import {
  BarChart3,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  XCircle,
} from 'lucide-react';

const levels = [
  {
    icon: Sparkles,
    labelKey: 'rep.new' as const,
    descKey: 'rep.levelNew' as const,
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    icon: ShieldCheck,
    labelKey: 'rep.honorable' as const,
    descKey: 'rep.levelHonorable' as const,
    tone: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: ShieldQuestion,
    labelKey: 'rep.fair' as const,
    descKey: 'rep.levelFair' as const,
    tone: 'bg-amber-100 text-amber-700',
  },
  {
    icon: ShieldAlert,
    labelKey: 'rep.unreliable' as const,
    descKey: 'rep.levelUnreliable' as const,
    tone: 'bg-rose-100 text-rose-700',
  },
];

export function ReputationSection() {
  const { t } = useTranslation();

  return (
    <section
      id="reputation"
      className="relative overflow-hidden bg-slate-50 py-16 sm:py-24"
    >
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
            <BarChart3 className="h-7 w-7 text-indigo-700" />
          </div>
          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {t('rep.eyebrow')}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {t('rep.howTitle')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            {t('rep.howDesc')}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-emerald-200 bg-white p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('rep.howHonored')}
            </p>
          </div>

          <div className="rounded-[28px] border border-rose-200 bg-white p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <XCircle className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('rep.howAbandoned')}
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-slate-500">
          {t('rep.howFormula')}
        </p>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {levels.map(({ icon: Icon, labelKey, descKey, tone }) => (
            <div
              key={labelKey}
              className="rounded-[28px] border border-slate-200 bg-white p-5"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {t(labelKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
