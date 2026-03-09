'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { RecentDuels } from '@/components/duel/RecentDuels';

export function RecentDuelsSection() {
  const { t } = useTranslation();

  return (
    <section
      id="recent-duels"
      className="border-t border-gray-200 bg-[#FAFAFA] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('recent.title')}
        </h2>
        <RecentDuels />
      </div>
    </section>
  );
}
