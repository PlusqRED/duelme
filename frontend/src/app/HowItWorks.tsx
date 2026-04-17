'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import {
  ArrowDown,
  ArrowRight,
  BadgePercent,
  Clock3,
  Eye,
  type LucideIcon,
  Lock,
  RotateCcw,
  ShieldCheck,
  Swords,
  Trophy,
  User,
} from 'lucide-react';

const DEMO_STAKE = '10 USDT';
const DEMO_POT = '20 USDT';

const steps = [
  {
    icon: Swords,
    titleKey: 'howItWorks.step1.title' as const,
    descKey: 'howItWorks.step1.desc' as const,
    number: '01',
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    icon: Lock,
    titleKey: 'howItWorks.step2.title' as const,
    descKey: 'howItWorks.step2.desc' as const,
    number: '02',
    tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  {
    icon: Trophy,
    titleKey: 'howItWorks.step3.title' as const,
    descKey: 'howItWorks.step3.desc' as const,
    number: '03',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
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
  tone,
  children,
}: {
  label: string;
  value: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[26px] border border-white/80 bg-white/90 p-4 text-center shadow-sm backdrop-blur-sm">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
        {children}
      </div>
      <div className="mt-3 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900 [text-wrap:balance]">
        {label}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {value}
      </div>
    </div>
  );
}

interface Payout {
  amount: string;
  recipient: string;
}

function OutcomeRouteCard({
  icon: Icon,
  title,
  description,
  payouts,
  tone,
  delayClass,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  payouts: Payout[];
  tone: string;
  delayClass?: string;
}) {
  return (
    <div
      className={`card-glow animate-soft-in flex h-full flex-col rounded-[28px] border border-white/80 bg-white/84 p-5 shadow-sm backdrop-blur-sm ${delayClass ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-200/70 border-t border-slate-200/70 md:mt-auto">
        {payouts.map((payout) => (
          <div
            key={payout.recipient}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate text-sm font-medium text-slate-700">
                {payout.recipient}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
              {payout.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { t } = useTranslation();

  const outcomeRoutes = [
    {
      icon: Trophy,
      title: t('howItWorks.outcomeConfirmed.title'),
      description: t('howItWorks.outcomeConfirmed.desc'),
      payouts: [{ amount: DEMO_POT, recipient: t('howItWorks.flow.winner') }],
      tone: 'bg-emerald-100 text-emerald-700',
      delayClass: 'animation-delay-100',
    },
    {
      icon: RotateCcw,
      title: t('howItWorks.outcomeDisputed.title'),
      description: t('howItWorks.outcomeDisputed.desc'),
      payouts: [
        { amount: DEMO_STAKE, recipient: t('howItWorks.flow.playerA') },
        { amount: DEMO_STAKE, recipient: t('howItWorks.flow.playerB') },
      ],
      tone: 'bg-amber-100 text-amber-700',
      delayClass: 'animation-delay-200',
    },
    {
      icon: Clock3,
      title: t('howItWorks.outcomeTimeout.title'),
      description: t('howItWorks.outcomeTimeout.desc'),
      payouts: [
        { amount: DEMO_STAKE, recipient: t('howItWorks.flow.playerA') },
        { amount: DEMO_STAKE, recipient: t('howItWorks.flow.playerB') },
      ],
      tone: 'bg-sky-100 text-sky-700',
      delayClass: 'animation-delay-300',
    },
  ];

  return (
    <section id="how-it-works" className="relative bg-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            {t('howItWorks.eyebrow')}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 [text-wrap:balance] sm:text-4xl">
            {t('howItWorks.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 [text-wrap:pretty] sm:text-lg">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
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

        <div className="mt-14 rounded-[36px] border border-slate-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.72)_0%,rgba(255,255,255,0.98)_56%,rgba(248,250,252,0.98)_100%)] p-6 shadow-[0_32px_90px_-56px_rgba(15,23,42,0.32)] sm:p-8">
          <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/88 p-5 text-center shadow-sm backdrop-blur-sm sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t('howItWorks.diagramEyebrow')}
            </div>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {t('howItWorks.diagramNote')}
            </p>

            <div className="mt-6 grid grid-cols-3 items-center gap-3 md:mx-auto md:max-w-3xl md:grid-cols-[minmax(80px,1fr)_64px_140px_64px_minmax(80px,1fr)]">
              <FlowNode
                label={t('howItWorks.flow.playerA')}
                value={DEMO_STAKE}
                tone="bg-sky-100 text-sky-700"
              >
                <User className="h-5 w-5" />
              </FlowNode>

              <div className="hidden space-y-2 md:block">
                <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {DEMO_STAKE}
                </div>
                <div className="flow-line-horizontal" />
              </div>

              <FlowNode
                label={t('howItWorks.flow.contract')}
                value={DEMO_POT}
                tone="bg-slate-950 text-white"
              >
                <Lock className="h-5 w-5 animate-float-y md:h-6 md:w-6" />
              </FlowNode>

              <div className="hidden space-y-2 md:block">
                <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {DEMO_STAKE}
                </div>
                <div className="flow-line-horizontal flow-line-horizontal-reverse" />
              </div>

              <FlowNode
                label={t('howItWorks.flow.playerB')}
                value={DEMO_STAKE}
                tone="bg-emerald-100 text-emerald-700"
              >
                <User className="h-5 w-5" />
              </FlowNode>
            </div>
          </div>

          <div className="my-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" aria-hidden />
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
              <ArrowDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {t('howItWorks.routesEyebrow')}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" aria-hidden />
          </div>

          <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            {t('howItWorks.routesNote')}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {outcomeRoutes.map((route) => (
              <OutcomeRouteCard key={route.title} {...route} />
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
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
