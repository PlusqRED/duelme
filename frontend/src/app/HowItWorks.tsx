'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import {
  BadgePercent,
  Eye,
  Lock,
  ShieldCheck,
  Swords,
  Trophy,
  User,
} from 'lucide-react';

const steps = [
  {
    icon: Swords,
    titleKey: 'howItWorks.step1.title' as const,
    descKey: 'howItWorks.step1.desc' as const,
    number: '01',
    tone: 'border-rose-200 bg-rose-50 text-rose-600',
  },
  {
    icon: Lock,
    titleKey: 'howItWorks.step2.title' as const,
    descKey: 'howItWorks.step2.desc' as const,
    number: '02',
    tone: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  },
  {
    icon: Trophy,
    titleKey: 'howItWorks.step3.title' as const,
    descKey: 'howItWorks.step3.desc' as const,
    number: '03',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  },
];

const securityFacts = [
  {
    icon: ShieldCheck,
    titleKey: 'howItWorks.security.code.title' as const,
    descKey: 'howItWorks.security.code.desc' as const,
    tone: 'bg-indigo-100 text-indigo-700',
  },
  {
    icon: BadgePercent,
    titleKey: 'howItWorks.security.fees.title' as const,
    descKey: 'howItWorks.security.fees.desc' as const,
    tone: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: Eye,
    titleKey: 'howItWorks.security.open.title' as const,
    descKey: 'howItWorks.security.open.desc' as const,
    tone: 'bg-sky-100 text-sky-700',
  },
];

function FlowNode({
  label,
  value,
  children,
  tone,
}: {
  label: string;
  value: string;
  children: ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/90 p-4 text-center shadow-sm backdrop-blur-sm">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
        {children}
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
        {value}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="relative bg-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {t('howItWorks.eyebrow')}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {t('howItWorks.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            {t('howItWorks.subtitle')}
          </p>
          <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
            {t('howItWorks.simple')}
          </div>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {steps.map(({ icon: Icon, titleKey, descKey, number, tone }) => (
            <div
              key={number}
              className="card-glow rounded-[28px] border border-slate-200 bg-slate-50/80 p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${tone}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {number}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                {t(titleKey)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,rgba(238,242,255,0.65)_0%,rgba(248,250,252,0.95)_100%)] p-6 sm:p-8">
          <div className="hidden sm:block">
            <div className="grid grid-cols-[minmax(0,1fr)_110px_160px_110px_minmax(0,1fr)] items-center gap-3">
              <FlowNode
                label={t('howItWorks.flow.playerA')}
                value="10 USDT"
                tone="bg-indigo-100 text-indigo-700"
              >
                <User className="h-6 w-6" />
              </FlowNode>

              <div className="space-y-2">
                <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  10 USDT
                </div>
                <div className="flow-line-horizontal" />
              </div>

              <FlowNode
                label={t('howItWorks.flow.contract')}
                value="20 USDT"
                tone="bg-slate-900 text-white"
              >
                <Lock className="h-6 w-6" />
              </FlowNode>

              <div className="space-y-2 rotate-180">
                <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  10 USDT
                </div>
                <div className="flow-line-horizontal" />
              </div>

              <FlowNode
                label={t('howItWorks.flow.playerB')}
                value="10 USDT"
                tone="bg-violet-100 text-violet-700"
              >
                <User className="h-6 w-6" />
              </FlowNode>
            </div>

            <div className="mx-auto mt-6 flex max-w-xs flex-col items-center">
              <span className="rounded-full border border-white/80 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t('howItWorks.flow.resultConfirmed')}
              </span>
              <div className="flow-line-vertical mt-3 h-16" />
              <div className="w-full">
                <FlowNode
                  label={t('howItWorks.flow.winner')}
                  value="20 USDT"
                  tone="bg-emerald-100 text-emerald-700"
                >
                  <Trophy className="h-6 w-6" />
                </FlowNode>
              </div>
            </div>
          </div>

          <div className="sm:hidden">
            <div className="grid grid-cols-3 gap-3">
              <FlowNode
                label={t('howItWorks.flow.playerA')}
                value="10 USDT"
                tone="bg-indigo-100 text-indigo-700"
              >
                <User className="h-5 w-5" />
              </FlowNode>
              <FlowNode
                label={t('howItWorks.flow.contract')}
                value="20 USDT"
                tone="bg-slate-900 text-white"
              >
                <Lock className="h-5 w-5" />
              </FlowNode>
              <FlowNode
                label={t('howItWorks.flow.playerB')}
                value="10 USDT"
                tone="bg-violet-100 text-violet-700"
              >
                <User className="h-5 w-5" />
              </FlowNode>
            </div>

            <div className="mx-auto mt-6 flex max-w-[220px] flex-col items-center">
              <span className="rounded-full border border-white/80 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t('howItWorks.flow.resultConfirmed')}
              </span>
              <div className="flow-line-vertical mt-3 h-14" />
              <div className="w-full">
                <FlowNode
                  label={t('howItWorks.flow.winner')}
                  value="20 USDT"
                  tone="bg-emerald-100 text-emerald-700"
                >
                  <Trophy className="h-5 w-5" />
                </FlowNode>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            {t('howItWorks.flow.caption')}
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {securityFacts.map(({ icon: Icon, titleKey, descKey, tone }) => (
            <div
              key={titleKey}
              className="card-glow rounded-[28px] border border-slate-200 bg-white p-6"
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
      </div>
    </section>
  );
}
