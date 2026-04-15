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
    tone: 'bg-sky-400/15 text-sky-200',
  },
  {
    icon: ShieldCheck,
    labelKey: 'rep.honorable' as const,
    descKey: 'rep.levelHonorable' as const,
    tone: 'bg-emerald-400/15 text-emerald-200',
  },
  {
    icon: ShieldQuestion,
    labelKey: 'rep.fair' as const,
    descKey: 'rep.levelFair' as const,
    tone: 'bg-amber-400/15 text-amber-200',
  },
  {
    icon: ShieldAlert,
    labelKey: 'rep.unreliable' as const,
    descKey: 'rep.levelUnreliable' as const,
    tone: 'bg-rose-400/15 text-rose-200',
  },
];

export function ReputationSection() {
  const { t } = useTranslation();

  return (
    <section
      id="reputation"
      className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_36%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] py-16 text-white sm:py-24"
    >
      <div className="section-divider absolute inset-x-0 top-0 opacity-40" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <BarChart3 className="h-7 w-7 text-indigo-200" />
          </div>
          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
            {t('rep.eyebrow')}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            {t('rep.howTitle')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            {t('rep.howDesc')}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-emerald-400/20 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
              {t('rep.howHonored')}
            </p>
          </div>

          <div className="rounded-[28px] border border-rose-400/20 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/15 text-rose-200">
              <XCircle className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
              {t('rep.howAbandoned')}
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-slate-400">
          {t('rep.howFormula')}
        </p>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {levels.map(({ icon: Icon, labelKey, descKey, tone }) => (
            <div
              key={labelKey}
              className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {t(labelKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
