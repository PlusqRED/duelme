'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { BadgePercent, Eye, KeyRound, Handshake } from 'lucide-react';

const items = [
  {
    icon: BadgePercent,
    titleKey: 'trust.noFees.title' as const,
    descKey: 'trust.noFees.desc' as const,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Eye,
    titleKey: 'trust.openSource.title' as const,
    descKey: 'trust.openSource.desc' as const,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: KeyRound,
    titleKey: 'trust.selfCustody.title' as const,
    descKey: 'trust.selfCustody.desc' as const,
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Handshake,
    titleKey: 'trust.honor.title' as const,
    descKey: 'trust.honor.desc' as const,
    color: 'bg-amber-100 text-amber-600',
  },
];

export function TrustSection() {
  const { t } = useTranslation();

  return (
    <section id="trust" className="relative bg-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('trust.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">
            {t('trust.subtitle')}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.titleKey}
                className="card-glow group flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 transition-all duration-300 hover:bg-white"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.color} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {t(item.titleKey)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {t(item.descKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
