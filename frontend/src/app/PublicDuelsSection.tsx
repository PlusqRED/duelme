'use client';

import Link from 'next/link';
import { useOpenDuels } from '@/hooks/useOpenDuels';
import { useNicknames } from '@/hooks/useNicknames';
import { useTranslation } from '@/i18n/useTranslation';
import { hasVisibleDuelMessage } from '@/lib/duelMessage';
import { truncateUnicode } from '@/lib/duel';
import { ArrowRight, Globe } from 'lucide-react';
import { useMemo } from 'react';

export function OpenDuelsSection() {
  const { t } = useTranslation();
  const { duels, isLoading } = useOpenDuels();

  const addresses = useMemo(() => duels.slice(0, 6).map((d) => d.creator), [duels]);
  const { resolveDisplay } = useNicknames(addresses);

  if (isLoading || duels.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('openDuels.title')}</h2>
          <p className="mt-1 text-slate-500">{t('openDuels.subtitle')}</p>
        </div>
        <Link
          href="/duels/open"
          className="hidden items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 sm:flex"
        >
          {t('openDuels.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {duels.slice(0, 6).map((duel) => (
          <Link
            key={duel.id}
            href={`/duel/${duel.id}`}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">{duel.wager} USDT</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                <Globe className="h-2.5 w-2.5" />
                {t('duel.public')}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {t('duel.createdBy')} {resolveDisplay(duel.creator)}
            </span>
            {hasVisibleDuelMessage(duel.message) && (
              <span className="text-xs text-slate-400 italic">
                &ldquo;{truncateUnicode(duel.message, 30)}&rdquo;
              </span>
            )}
          </Link>
        ))}
      </div>
      <div className="mt-6 text-center sm:hidden">
        <Link href="/duels/open" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          {t('openDuels.viewAll')} →
        </Link>
      </div>
    </section>
  );
}
