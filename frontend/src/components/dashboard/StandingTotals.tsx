'use client';

import { PlayerTotals } from '@/components/identity/PlayerTotals';
import { useTranslation } from '@/i18n/useTranslation';
import type { MyTotals } from '@/lib/dashboard';

/** The reader's totals on their card, under the reputation. */
export function StandingTotals({ totals }: { totals: MyTotals }) {
  const { t } = useTranslation();

  return (
    <div className="grid content-start gap-3 border-t border-line pt-4">
      <h3 className="text-base font-strong">{t('dash.totals')}</h3>
      <PlayerTotals totals={totals} />
    </div>
  );
}
