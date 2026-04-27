'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { RecentDuelsTeaser } from '@/components/duel/recent/RecentDuelsTeaser';

export function RecentDuelsSection() {
  const { t } = useTranslation();

  return (
    <section
      id="recent-duels"
      className="relative bg-slate-50 bg-dots py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('recent.title')}
          </h2>
          <p className="mt-3 text-base text-slate-500">
            {t('recent.subtitle')}
          </p>
        </div>
        <RecentDuelsTeaser />
      </div>
    </section>
  );
}
