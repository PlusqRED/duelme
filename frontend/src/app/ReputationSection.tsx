'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { BarChart3, CheckCircle2, XCircle, Sparkles, ShieldCheck, ShieldQuestion, ShieldAlert } from 'lucide-react';

const levels = [
  {
    icon: Sparkles,
    labelKey: 'rep.new' as const,
    descKey: 'rep.levelNew' as const,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: ShieldCheck,
    labelKey: 'rep.honorable' as const,
    descKey: 'rep.levelHonorable' as const,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: ShieldQuestion,
    labelKey: 'rep.fair' as const,
    descKey: 'rep.levelFair' as const,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: ShieldAlert,
    labelKey: 'rep.unreliable' as const,
    descKey: 'rep.levelUnreliable' as const,
    color: 'bg-red-100 text-red-600',
  },
];

export function ReputationSection() {
  const { t } = useTranslation();

  return (
    <section id="reputation" className="relative bg-slate-50 bg-dots py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('rep.howTitle')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            {t('rep.howDesc')}
          </p>
        </div>

        {/* What counts: honored vs abandoned */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="group flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform duration-300 group-hover:scale-110">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('rep.howHonored')}
            </p>
          </div>
          <div className="group flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-red-200 hover:shadow-lg hover:shadow-red-50">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500 transition-transform duration-300 group-hover:scale-110">
              <XCircle className="h-6 w-6" />
            </div>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('rep.howAbandoned')}
            </p>
          </div>
        </div>

        {/* Formula explanation */}
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-500">Wilson Score</span>
          {' — '}
          {t('rep.howFormula')}
        </p>

        {/* Badge levels */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 grid-cols-2 sm:grid-cols-4">
          {levels.map(({ icon: Icon, labelKey, descKey, color }) => (
            <div
              key={labelKey}
              className="card-glow group flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 text-center transition-all duration-300"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                {t(labelKey)}
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
